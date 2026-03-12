import type { Cheerio } from 'cheerio';
import type { AnyNode } from 'domhandler';

import { loadHtml, textOf } from './html.util';
import type { SiiauCourseDto } from '../dto/siiau.dto';

export function parseRegistroLista(html: string): {
  courses: SiiauCourseDto[];
} {
  const $ = loadHtml(html);

  let target: Cheerio<AnyNode> | null = null;

  const tables = $('table').toArray();
  for (const t of tables) {
    const txt = textOf($(t)).toUpperCase();
    if (
      txt.includes('NRC') &&
      txt.includes('CLAVE') &&
      txt.includes('MATERIA') &&
      (txt.includes('CREDITOS') || txt.includes('CRÉDITOS'))
    ) {
      target = $(t) as unknown as Cheerio<AnyNode>;
      break;
    }
  }

  if (!target) {
    throw new Error(
      'No pude localizar tabla de Lista (NRC/CLAVE/MATERIA/CREDITOS).',
    );
  }

  let idxNrc = 0;
  let idxClave = 1;
  let idxMateria = 2;
  let idxCred = 3;

  const headerTrs = target.find('tr').toArray();
  for (const tr of headerTrs) {
    const cells = $(tr).find('th,td');
    const texts = cells.toArray().map((c) => textOf($(c)).toUpperCase());

    if (
      texts.includes('NRC') &&
      texts.includes('CLAVE') &&
      texts.includes('MATERIA')
    ) {
      idxNrc = texts.indexOf('NRC');
      idxClave = texts.indexOf('CLAVE');
      idxMateria = texts.indexOf('MATERIA');

      if (texts.includes('CREDITOS')) idxCred = texts.indexOf('CREDITOS');
      else if (texts.includes('CRÉDITOS')) idxCred = texts.indexOf('CRÉDITOS');

      break;
    }
  }

  const courses: SiiauCourseDto[] = [];

  const dataTrs = target.find('tr').toArray();
  for (const tr of dataTrs) {
    const tds = $(tr).find('td');
    if (!tds.length) continue;

    const nrc = (textOf(tds.eq(idxNrc)) ?? '').trim();
    if (!/^\d{4,}$/.test(nrc)) continue;

    const clave = (textOf(tds.eq(idxClave)) ?? '').trim();
    const materia = (textOf(tds.eq(idxMateria)) ?? '').trim();

    let creditos: number | null = null;
    if (idxCred < tds.length) {
      const c = (textOf(tds.eq(idxCred)) ?? '').trim();
      if (/^\d+$/.test(c)) creditos = Number(c);
    }

    courses.push({ nrc, clave, materia, creditos });
  }

  if (!courses.length) {
    throw new Error('No se extrajo ningún curso desde Lista (vacío).');
  }

  return { courses };
}
