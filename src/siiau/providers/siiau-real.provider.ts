import { Injectable } from '@nestjs/common';
import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { CookieJar } from 'tough-cookie';
import * as https from 'node:https';

import type { SiiauProvider } from '../siiau.provider';
import type {
  SiiauSnapshotDto,
  SiiauSnapshotRequestDto,
} from '../dto/siiau.dto';
import { parseRegistroLista } from '../parsers/registro-lista.parser';
import { parseOferta } from '../parsers/oferta.parser';
import {
  extractMojarraPairs,
  extractViewState,
  findFormByName,
  parseFrames,
  patchMajrp,
  resolveCicloFromSelect,
  shouldApplyRevisaCarrera,
  urlFromJs,
  loadHtml,
  textOf,
  urlJoin,
} from '../parsers/html.util';

@Injectable()
export class SiiauRealProvider implements SiiauProvider {
  private readonly http: AxiosInstance;
  private readonly jar: CookieJar;

  private readonly URL_LOGIN = 'https://mw.siiau.udg.mx/Portal/login.xhtml';
  private readonly BASE_ESCOLAR = 'https://siiauescolar.siiau.udg.mx';
  private readonly WUS = `${this.BASE_ESCOLAR}/wus`;
  private readonly WAL = `${this.BASE_ESCOLAR}/wal`;
  private readonly URL_EMICORE = `${this.WUS}/gupprincipal.emicore`;

  private readonly timeoutMs: number;
  private readonly verifyTls: boolean;
  private readonly minSleepMs: number;
  private readonly maxSleepMs: number;

  constructor() {
    this.timeoutMs = Number(process.env.SIIAU_TIMEOUT_MS ?? 25_000);
    this.verifyTls =
      (process.env.SIIAU_VERIFY_TLS ?? 'true').toLowerCase() === 'true';
    this.minSleepMs = Number(process.env.SIIAU_MIN_SLEEP_MS ?? 200);
    this.maxSleepMs = Number(process.env.SIIAU_MAX_SLEEP_MS ?? 700);

    this.jar = new CookieJar();
    const httpsAgent = new https.Agent({ rejectUnauthorized: this.verifyTls });

    this.http = axios.create({
      timeout: this.timeoutMs,
      httpsAgent,
      maxRedirects: 5,
      validateStatus: (s) => (s >= 200 && s < 400) || s === 302,
    });

    this.http.interceptors.request.use(async (config) => {
      const abs = this.resolveAbsoluteUrlFromConfig(config.baseURL, config.url);
      if (abs) {
        const cookie = await this.jar.getCookieString(abs);
        if (cookie) {
          this.setCookieHeader(config, cookie);
        }
      }

      return config;
    });

    // Store cookies from response
    this.http.interceptors.response.use(async (res) => {
      const abs =
        this.getFinalUrl(res) ??
        this.resolveAbsoluteUrlFromConfig(res.config.baseURL, res.config.url);
      const setCookie = res.headers['set-cookie'];

      if (abs && setCookie) {
        const cookies = Array.isArray(setCookie)
          ? setCookie
          : [String(setCookie)];
        for (const c of cookies) {
          try {
            await this.jar.setCookie(c, abs);
          } catch {
            // ignore cookie parse errors
          }
        }
      }

      return res;
    });
  }

  async fetchSnapshot(
    input: SiiauSnapshotRequestDto,
  ): Promise<SiiauSnapshotDto> {
    const { codigo, nip, carreraPrefer, cicloPrefer } = input;

    const dashboardHtml = await this.loginMw(codigo, nip);
    const entry = await this.jumpToEscolar(dashboardHtml);

    const { pidm, menuHtml, menuUrl } = await this.openMenuSistemaAndPidm(
      entry.url,
      entry.html,
    );

    const alumnos = await this.goToAlumnosUni(menuUrl, menuHtml);

    const registroMenu = await this.openByText(
      alumnos.url,
      alumnos.html,
      'REGISTRO',
      carreraPrefer,
    );
    const lista = await this.openByText(
      registroMenu.url,
      registroMenu.html,
      'Lista',
      carreraPrefer,
    );

    const { courses } = parseRegistroLista(lista.html);

    const { majrp, ciclo } = this.resolveCareer(carreraPrefer, cicloPrefer);
    if (!majrp) {
      throw new Error(
        'No pude resolver majrp. Usa carreraPrefer como INNI-202210.',
      );
    }

    const oferta = await this.fetchOferta(
      pidm,
      majrp,
      ciclo ?? '202210',
      lista.url,
    );
    const ofertaParsed = parseOferta(oferta.html);

    const ofertaMap = new Map<string, (typeof ofertaParsed.rows)[number]>();
    for (const r of ofertaParsed.rows) ofertaMap.set(r.nrc, r);

    const merged = courses.map((c) => {
      const row = ofertaMap.get(c.nrc);
      if (!row) return { ...c, warnings: ['NRC_NOT_FOUND_IN_OFERTA'] };

      return {
        ...c,
        sec: row.sec ?? null,
        sessions: row.sessions ?? [],
        profesor: row.profesor ?? null,
        warnings: [],
      };
    });

    const withSchedule = merged.filter(
      (c) => (c.sessions?.length ?? 0) > 0,
    ).length;

    return {
      timestamp: new Date().toISOString(),
      pidm,
      carrera_value: carreraPrefer ?? null,
      majrp,
      ciclo: ciclo ?? null,
      courses: merged,
      stats: {
        total_courses: merged.length,
        with_schedule: withSchedule,
        missing_schedule: merged.length - withSchedule,
      },
    };
  }

  // ---------------- helpers ----------------
  private async sleepJitter(): Promise<void> {
    const ms = Math.floor(
      this.minSleepMs + Math.random() * (this.maxSleepMs - this.minSleepMs),
    );
    await new Promise((r) => setTimeout(r, ms));
  }

  private setCookieHeader(
    config: InternalAxiosRequestConfig,
    cookie: string,
  ): void {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Cookie', cookie);
    config.headers = headers;
  }

  private resolveAbsoluteUrlFromConfig(
    baseURL?: string,
    url?: string,
  ): string | undefined {
    if (!url) return undefined;
    if (URL.canParse(url)) {
      return url;
    }
    if (!baseURL) return undefined;
    return urlJoin(baseURL, url);
  }

  private getFinalUrl(res: AxiosResponse): string | undefined {
    const req = res.request as unknown;
    if (typeof req !== 'object' || req === null) return undefined;

    const reqObj = req as { res?: unknown };
    const inner = reqObj.res;
    if (typeof inner !== 'object' || inner === null) return undefined;

    const innerObj = inner as { responseUrl?: unknown };
    return typeof innerObj.responseUrl === 'string'
      ? innerObj.responseUrl
      : undefined;
  }

  private resolveCareer(
    carreraPrefer?: string,
    cicloPrefer?: string,
  ): { majrp: string; ciclo?: string } {
    if (carreraPrefer && carreraPrefer.includes('-')) {
      const [majrp, ciclo] = carreraPrefer.split('-', 2);
      return { majrp, ciclo: cicloPrefer ?? ciclo };
    }
    return { majrp: (carreraPrefer ?? '').trim(), ciclo: cicloPrefer };
  }

  private async loginMw(codigo: string, nip: string): Promise<string> {
    await this.sleepJitter();
    const rGet = await this.http.get(this.URL_LOGIN, {
      headers: { Referer: this.URL_LOGIN },
    });
    const htmlGet = rGet.data as string;

    const viewState = extractViewState(htmlGet);
    if (!viewState)
      throw new Error('No se pudo obtener javax.faces.ViewState en login.');

    const $ = loadHtml(htmlGet);
    let btnName = '';
    $('button')
      .toArray()
      .forEach((b) => {
        const t = textOf($(b));
        if (t.includes('Aceptar')) btnName = ($(b).attr('name') ?? '').trim();
      });

    const payload: Record<string, string> = {
      'javax.faces.ViewState': viewState,
      loginForm: 'loginForm',
      'loginForm:codigo': codigo,
      'loginForm:password': nip,
    };
    if (btnName) payload[btnName] = 'Aceptar';

    await this.sleepJitter();
    const rPost = await this.http.post(
      this.URL_LOGIN,
      new URLSearchParams(payload),
      {
        headers: {
          Referer: this.URL_LOGIN,
          Origin: 'https://mw.siiau.udg.mx',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const htmlPost = rPost.data as string;
    if ((htmlPost ?? '').includes('name="loginForm:password"')) {
      throw new Error('Credenciales incorrectas (login no avanzó).');
    }
    return htmlPost;
  }

  private async jumpToEscolar(
    dashboardHtml: string,
  ): Promise<{ url: string; html: string }> {
    const $ = loadHtml(dashboardHtml);
    const form = $('form#sistemasForm');
    if (!form.length) throw new Error('No se halló dashboard (sistemasForm).');

    const action = (form.attr('action') ?? '').trim();
    if (!action) throw new Error('No se encontró action del sistemasForm.');

    const viewState = extractViewState(dashboardHtml);
    if (!viewState) throw new Error('No se encontró ViewState en dashboard.');

    const enlace = $('a')
      .toArray()
      .find(
        (a) =>
          ($(a).attr('onclick') ?? '').includes('mojarra.jsfcljs') &&
          ($(a).attr('onclick') ?? '').includes('sistemasForm'),
      );
    if (!enlace)
      throw new Error('No se encontró botón a Escolar (mojarra.jsfcljs).');

    const onclick = ($(enlace).attr('onclick') ?? '').trim();
    const pairs = extractMojarraPairs(onclick);

    const payload: Record<string, string> = {
      'javax.faces.ViewState': viewState,
      sistemasForm: 'sistemasForm',
      ...pairs,
    };

    const urlDestino = urlJoin(this.URL_LOGIN, action);

    await this.sleepJitter();
    const rPuente = await this.http.post(
      urlDestino,
      new URLSearchParams(payload),
      {
        maxRedirects: 0,
        headers: {
          Referer: this.URL_LOGIN,
          Origin: 'https://mw.siiau.udg.mx',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        validateStatus: (s) => (s >= 200 && s < 400) || s === 302,
      },
    );

    const loc = (rPuente.headers['location'] as string | undefined) ?? '';
    const nextUrl = loc ? urlJoin(urlDestino, loc) : this.URL_EMICORE;

    await this.sleepJitter();
    const rEntry = await this.http.get(nextUrl, {
      headers: { Referer: this.URL_LOGIN },
    });
    return { url: nextUrl, html: rEntry.data as string };
  }

  private async openMenuSistemaAndPidm(
    entryUrl: string,
    entryHtml: string,
  ): Promise<{ pidm: string; menuHtml: string; menuUrl: string }> {
    const frames = parseFrames(entryHtml).map((f) => ({
      name: f.name,
      src: urlJoin(entryUrl, f.src),
    }));
    const mainUrl = frames.find((f) => f.name === 'mainFrame')?.src;
    const topUrl = frames.find((f) => f.name === 'topFrame')?.src;

    if (topUrl) {
      await this.sleepJitter();
      await this.http.get(topUrl, { headers: { Referer: entryUrl } });
    }
    if (!mainUrl) throw new Error('No se encontró mainFrame.');

    await this.sleepJitter();
    const rMain = await this.http.get(mainUrl, {
      headers: { Referer: entryUrl },
    });
    const mainHtml = rMain.data as string;

    const fInicio = findFormByName(mainHtml, 'fInicio');
    if (!fInicio || fInicio.method !== 'POST')
      throw new Error('No se encontró fInicio POST.');

    const fInicioUrl = urlJoin(mainUrl, fInicio.action);

    await this.sleepJitter();
    const rVal = await this.http.post(
      fInicioUrl,
      new URLSearchParams(fInicio.inputs),
      {
        headers: {
          Referer: mainUrl,
          Origin: this.BASE_ESCOLAR,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );
    const valHtml = rVal.data as string;

    const mainPage = findFormByName(valHtml, 'mainPage');
    if (!mainPage) throw new Error('No se encontró mainPage.');

    const pidm = (mainPage.inputs['p_pidm_n'] ?? '').trim();
    if (!pidm) throw new Error('No se pudo extraer PIDM.');

    const baseForMainPage = this.getFinalUrl(rVal) ?? fInicioUrl;
    const mainPageUrl = urlJoin(baseForMainPage, mainPage.action);

    await this.sleepJitter();
    const rFm = await this.http.post(
      mainPageUrl,
      new URLSearchParams(mainPage.inputs),
      {
        headers: {
          Referer: fInicioUrl,
          Origin: this.BASE_ESCOLAR,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const fmHtml = rFm.data as string;
    const frames2 = parseFrames(fmHtml).map((f) => ({
      name: f.name,
      src: urlJoin(mainPageUrl, f.src),
    }));

    const menuUrl = frames2.find(
      (f) =>
        f.name === 'Menu' ||
        f.src.toLowerCase().includes('gupmenug.menu_sistema'),
    )?.src;
    if (!menuUrl) throw new Error('No se encontró frame Menu (menu_sistema).');

    await this.sleepJitter();
    const rMenu = await this.http.get(menuUrl, {
      headers: { Referer: mainPageUrl },
    });
    return { pidm, menuHtml: rMenu.data as string, menuUrl };
  }

  private async goToAlumnosUni(
    menuUrl: string,
    menuHtml: string,
  ): Promise<{ url: string; html: string }> {
    const $ = loadHtml(menuHtml);
    const link = $('a')
      .toArray()
      .map((a) => $(a).attr('href') ?? '')
      .find(
        (href) =>
          /(?:\?|&)p_sistema_c=ALUMNOS(?:&|$)/.test(href) &&
          !href.toUpperCase().includes('SEMS'),
      );
    if (!link)
      throw new Error('No encontré módulo ALUMNOS (UNI) en menu_sistema.');

    const target = urlJoin(menuUrl, link);

    await this.sleepJitter();
    const r = await this.http.get(target, { headers: { Referer: menuUrl } });
    const finalUrl = this.getFinalUrl(r) ?? target;
    return { url: finalUrl, html: r.data as string };
  }

  private setSelectedCarreraFromPage(html: string, prefer?: string) {
    const $ = loadHtml(html);
    const sel = $("select[name='p_carrera'], select#carreraID").first();
    if (!sel.length) {
      return {
        carreraValue: null as string | null,
        majrp: null as string | null,
        ciclo: null as string | null,
      };
    }

    const options = sel
      .find('option')
      .toArray()
      .map((o) => ({
        value: ($(o).attr('value') ?? '').trim(),
        selected: $(o).is('[selected]'),
      }));

    let chosen = '';
    if (prefer) {
      const hit = options.find((o) => o.value === prefer);
      if (hit) chosen = hit.value;
    }
    if (!chosen) {
      const inni = options.find((o) => o.value.toUpperCase().includes('INNI'));
      if (inni) chosen = inni.value;
    }
    if (!chosen) {
      const selOpt = options.find((o) => o.selected);
      if (selOpt) chosen = selOpt.value;
    }
    if (!chosen) chosen = options[0]?.value ?? '';

    if (!chosen) return { carreraValue: null, majrp: null, ciclo: null };
    if (chosen.includes('-')) {
      const [majrp, ciclo] = chosen.split('-', 2);
      return { carreraValue: chosen, majrp, ciclo };
    }
    return { carreraValue: chosen, majrp: chosen, ciclo: null };
  }

  private async openByText(
    baseUrl: string,
    html: string,
    label: string,
    carreraPrefer?: string,
  ): Promise<{ url: string; html: string }> {
    const selected = this.setSelectedCarreraFromPage(html, carreraPrefer);
    const majrp = selected.majrp;

    const $ = loadHtml(html);

    let aEl: unknown = null;
    for (const a of $('a').toArray()) {
      const t = textOf($(a)).toUpperCase();
      if (t === label.toUpperCase()) {
        aEl = a;
        break;
      }
    }
    if (!aEl) {
      for (const a of $('a').toArray()) {
        const t = textOf($(a)).toUpperCase();
        if (t.includes(label.toUpperCase())) {
          aEl = a;
          break;
        }
      }
    }
    if (!aEl) throw new Error(`No encontré link '${label}' en la página.`);

    const a = $(aEl as Parameters<typeof $>[0]);
    const href = (a.attr('href') ?? '').trim();
    const onclick = (a.attr('onclick') ?? '').trim();

    let target = '';
    if (href && !href.toLowerCase().startsWith('javascript:')) target = href;
    else if (href.toLowerCase().startsWith('javascript:'))
      target = urlFromJs(href);
    if (!target) target = urlFromJs(onclick);

    if (!target) throw new Error(`No pude resolver URL para link '${label}'.`);

    if (shouldApplyRevisaCarrera(onclick, target)) {
      target = patchMajrp(target, majrp);
    }

    const abs = urlJoin(baseUrl, target);

    await this.sleepJitter();
    const r = await this.http.get(abs, { headers: { Referer: baseUrl } });
    const finalUrl = this.getFinalUrl(r) ?? abs;
    return { url: finalUrl, html: r.data as string };
  }

  private async fetchOferta(
    pidm: string,
    majrp: string,
    cicloDesired: string,
    referer: string,
  ): Promise<{ url: string; html: string }> {
    const formUrl = `${this.WAL}/sgpofer.secciones?pidmp=${pidm}&majrp=${majrp}`;

    await this.sleepJitter();
    const rForm = await this.http.get(formUrl, {
      headers: { Referer: referer },
    });
    const formHtml = rForm.data as string;

    const $ = loadHtml(formHtml);
    const formTag = $("form[name='frm_consulta_oferta']").first().length
      ? $("form[name='frm_consulta_oferta']").first()
      : $('form').first();

    const action = (formTag.attr('action') ?? 'sspseca.consulta_oferta').trim();
    const base = this.getFinalUrl(rForm) ?? formUrl;
    const postUrl = urlJoin(base, action);

    const cicloValue = resolveCicloFromSelect(formHtml, cicloDesired);

    const payload: Record<string, string> = {
      ciclop: cicloValue,
      cup: '',
      majrp,
      majrdescp: '',
      crsep: '',
      materiap: '',
      horaip: '',
      horafp: '',
      edifp: '',
      aulap: '',
      dispp: '',
      ordenp: '0',
      mostrarp: '500',
    };

    await this.sleepJitter();
    const rRes = await this.http.post(postUrl, new URLSearchParams(payload), {
      headers: {
        Referer: base,
        Origin: this.BASE_ESCOLAR,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const finalUrl = this.getFinalUrl(rRes) ?? postUrl;
    return { url: finalUrl, html: rRes.data as string };
  }
}
