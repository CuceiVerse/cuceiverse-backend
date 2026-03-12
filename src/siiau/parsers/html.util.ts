import * as cheerio from 'cheerio';

export function loadHtml(html: string) {
  return cheerio.load(html ?? '');
}

export function textOf(el: cheerio.Cheerio<any>): string {
  return (el.text() ?? '').replace(/\u00a0/g, ' ').trim();
}

export function attrOf(el: cheerio.Cheerio<any>, name: string): string {
  return (el.attr(name) ?? '').trim();
}

export function urlFromJs(js: string): string {
  if (!js) return '';
  const patterns = [
    /openWin\(\s*'([^']+)'\s*\)/i,
    /openWin\(\s*"([^"]+)"\s*\)/i,
    /window\.open\(\s*'([^']+)'\s*\)/i,
    /window\.open\(\s*"([^"]+)"\s*\)/i,
    /location\.href\s*=\s*'([^']+)'/i,
    /location\.href\s*=\s*"([^"]+)"/i,
  ];
  for (const p of patterns) {
    const m = js.match(p);
    if (m?.[1]) return m[1];
  }
  return '';
}

export function shouldApplyRevisaCarrera(
  onclick: string,
  href: string,
): boolean {
  const s = (onclick ?? '').toLowerCase();
  return s.includes('revisacarrera') || (href ?? '').includes('majrp=');
}

export function setOrReplaceParam(
  url: string,
  key: string,
  value: string,
): string {
  if (!url) return url;
  const re = new RegExp(`(${escapeRegExp(key)}=)[^&]*`);
  if (re.test(url)) return url.replace(re, `$1${value}`);
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}${key}=${value}`;
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function patchMajrp(
  url: string,
  majrp: string | null | undefined,
): string {
  if (!url || !majrp) return url;
  return setOrReplaceParam(url, 'majrp', majrp);
}

export function parseFrames(
  html: string,
): Array<{ name?: string; src: string }> {
  const $ = loadHtml(html);
  const frames: Array<{ name?: string; src: string }> = [];
  $('frame').each((_, fr) => {
    const name = ($(fr).attr('name') ?? '').trim() || undefined;
    const src = ($(fr).attr('src') ?? '').trim();
    if (src) frames.push({ name, src });
  });
  return frames;
}

export function extractViewState(html: string): string {
  const $ = loadHtml(html);
  const vs = $("input[name='javax.faces.ViewState']").attr('value');
  return (vs ?? '').trim();
}

export function findFormById(
  html: string,
  formId: string,
): { action: string; method: string; inputs: Record<string, string> } | null {
  const $ = loadHtml(html);
  const form = $(`form#${cssEscape(formId)}`);
  if (!form.length) return null;
  return extractForm($, form);
}

export function findFormByName(
  html: string,
  name: string,
): { action: string; method: string; inputs: Record<string, string> } | null {
  const $ = loadHtml(html);
  const form = $(`form[name='${cssEscape(name)}']`);
  if (!form.length) return null;
  return extractForm($, form);
}

function extractForm($: cheerio.CheerioAPI, form: cheerio.Cheerio<any>) {
  const action = (form.attr('action') ?? '').trim();
  const method = (form.attr('method') ?? 'GET').toUpperCase().trim();
  const inputs: Record<string, string> = {};
  form.find('input').each((_, inp) => {
    const name = ($(inp).attr('name') ?? '').trim();
    if (!name) return;
    const val = ($(inp).attr('value') ?? '').toString();
    inputs[name] = val;
  });
  return { action, method, inputs };
}

export function cssEscape(s: string): string {
  return s.replace(/'/g, "\\'");
}

/**
 * Extrae pares {'k':'v'} del onclick mojarra.jsfcljs(..., {..}, ..)
 */
export function extractMojarraPairs(onclick: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!onclick) return out;
  const objMatch = onclick.match(/\{([\s\S]*?)\}/);
  if (!objMatch?.[1]) return out;

  const pairs = [
    ...objMatch[1].matchAll(/['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/g),
  ];
  for (const p of pairs) out[p[1]] = p[2];
  return out;
}

export function resolveCicloFromSelect(html: string, desired: string): string {
  const $ = loadHtml(html);
  const sel = $("select[name='ciclop']");
  if (!sel.length) return desired;

  const values: string[] = [];
  sel.find('option').each((_, opt) => {
    const v = ($(opt).attr('value') ?? '').trim();
    if (v) values.push(v);
  });

  if (values.includes(desired)) return desired;

  // match by year prefix and 6-digit numeric
  const year = desired.slice(0, 4);
  const pref = values.find((v) => v.startsWith(year) && /^\d{6}$/.test(v));
  if (pref) return pref;

  const firstNumeric = values.find((v) => /^\d{6}$/.test(v));
  return firstNumeric ?? values[0] ?? desired;
}

export function urlJoin(base: string, rel: string): string {
  try {
    return new URL(rel, base).toString();
  } catch {
    return rel;
  }
}
