import type { Cheerio } from 'cheerio';
import type { AnyNode } from 'domhandler';

import { loadHtml, textOf } from './html.util';
import type { SiiauScheduleSessionDto } from '../dto/siiau.dto';

export interface OfertaRow {
  cu?: string | null;
  nrc: string;
  clave?: string | null;
  materia?: string | null;
  sec?: string | null;
  cr?: number | null;
  cup?: number | null;
  dis?: number | null;
  sessions: SiiauScheduleSessionDto[];
  profesor?: string | null;
}

export function parseOferta(html: string): {
  ciclo?: string | null;
  rows: OfertaRow[];
} {
  const $ = loadHtml(html);
  const pageTxt = textOf($.root());

  const ciclo = (() => {
    const m = pageTxt.match(/ciclo\s+(\d{6})/i);
    return m?.[1] ?? null;
  })();

  let main: Cheerio<AnyNode> | null = null;

  const tables = $('table').toArray();
  for (const t of tables) {
    const ths = $(t)
      .find('th')
      .toArray()
      .map((th) => textOf($(th)).toUpperCase());

    const hasNrc = ths.includes('NRC');
    const hasClave = ths.includes('CLAVE');
    const hasMateria = ths.includes('MATERIA');
    const hasSes = ths.some((x) => x.includes('SES/HORA'));

    if (hasNrc && hasClave && hasMateria && hasSes) {
      main = $(t) as unknown as Cheerio<AnyNode>;
      break;
    }
  }

  if (!main) {
    throw new Error(
      'No pude localizar tabla principal de Oferta (headers NRC/Clave/Materia/Ses...).',
    );
  }

  const rows: OfertaRow[] = [];

  const trs = main.find('tr').toArray();
  for (const tr of trs) {
    const tds = $(tr).find('td');
    if (tds.length < 9) continue;

    const cu = textOf(tds.eq(0));
    const nrc = textOf(tds.eq(1));
    if (!/^\d{4,}$/.test(nrc)) continue;

    const clave = textOf(tds.eq(2));
    const materia = textOf(tds.eq(3));
    const sec = textOf(tds.eq(4));

    const crTxt = textOf(tds.eq(5));
    const cupTxt = textOf(tds.eq(6));
    const disTxt = textOf(tds.eq(7));

    const cr = /^\d+$/.test(crTxt) ? Number(crTxt) : null;
    const cup = /^\d+$/.test(cupTxt) ? Number(cupTxt) : null;
    const dis = /^-?\d+$/.test(disTxt) ? Number(disTxt) : null;

    const sessions: SiiauScheduleSessionDto[] = [];
    const schedCell = tds.eq(8);
    const schedTable = schedCell.find('table').first();

    if (schedTable.length) {
      const schedTrs = schedTable.find('tr').toArray();
      for (const sTr of schedTrs) {
        const sTds = $(sTr).find('td');
        if (sTds.length < 6) continue;

        const ses = textOf(sTds.eq(0));
        const hora = textOf(sTds.eq(1));
        const dias = textOf(sTds.eq(2));
        const edif = textOf(sTds.eq(3));
        const aula = textOf(sTds.eq(4));
        const periodo = textOf(sTds.eq(5));

        if (!ses && !hora && !dias && !periodo) continue;

        sessions.push({
          ses: ses || null,
          hora: hora || null,
          dias: dias || null,
          edif: edif || null,
          aula: aula || null,
          periodo: periodo || null,
          profesor: null,
        });
      }
    }

    let profesor: string | null = null;
    const profBySes = new Map<string, string>();

    if (tds.length >= 10) {
      const profCell = tds.eq(9);
      const profTrs = profCell.find('tr').toArray();

      for (const pTr of profTrs) {
        const pTds = $(pTr).find('td');
        if (pTds.length < 2) continue;

        const pSes = textOf(pTds.eq(0));
        const pName = textOf(pTds.eq(1));

        if (pName) profesor = profesor ?? pName;
        if (pSes && pName) profBySes.set(pSes, pName);
      }
    }

    for (const s of sessions) {
      const sesKey = (s.ses ?? '').trim();
      s.profesor =
        sesKey && profBySes.has(sesKey)
          ? (profBySes.get(sesKey) ?? null)
          : profesor;
    }

    rows.push({
      cu: cu || null,
      nrc,
      clave: clave || null,
      materia: materia || null,
      sec: sec || null,
      cr,
      cup,
      dis,
      sessions,
      profesor,
    });
  }

  if (!rows.length) {
    throw new Error(
      'Tabla encontrada pero no extraje filas NRC (HTML inesperado).',
    );
  }

  return { ciclo, rows };
}
