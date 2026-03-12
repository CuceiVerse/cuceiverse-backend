import { loadHtml, textOf } from "./html.util";
import { SiiauCourseDto } from "../dto/siiau.dto";

export function parseRegistroLista(html: string): { courses: SiiauCourseDto[] } {
  const $ = loadHtml(html);

  let target: any = null;

  $("table").each((_, t) => {
    if (target) return;
    const txt = textOf($(t)).toUpperCase();
    if (
      txt.includes("NRC") &&
      txt.includes("CLAVE") &&
      txt.includes("MATERIA") &&
      (txt.includes("CREDITOS") || txt.includes("CRÉDITOS"))
    ) {
      target = $(t);
    }
  });

  if (!target) {
    throw new Error("No pude localizar tabla de Lista (NRC/CLAVE/MATERIA/CREDITOS).");
  }

  // índices por header
  let idxNrc = 0,
    idxClave = 1,
    idxMateria = 2,
    idxCred = 3;

  target.find("tr").each((_, tr) => {
    const cells = $(tr).find("th,td");
    const texts = cells
      .toArray()
      .map((c) => textOf($(c)).toUpperCase());

    if (texts.includes("NRC") && texts.includes("CLAVE") && texts.includes("MATERIA")) {
      idxNrc = texts.indexOf("NRC");
      idxClave = texts.indexOf("CLAVE");
      idxMateria = texts.indexOf("MATERIA");
      if (texts.includes("CREDITOS")) idxCred = texts.indexOf("CREDITOS");
      else if (texts.includes("CRÉDITOS")) idxCred = texts.indexOf("CRÉDITOS");
      return false; // break
    }
    return;
  });

  const courses: SiiauCourseDto[] = [];

  target.find("tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (!tds.length) return;

    const nrc = (textOf(tds.eq(idxNrc)) ?? "").trim();
    if (!/^\d{4,}$/.test(nrc)) return;

    const clave = (textOf(tds.eq(idxClave)) ?? "").trim();
    const materia = (textOf(tds.eq(idxMateria)) ?? "").trim();

    let creditos: number | null = null;
    if (idxCred < tds.length) {
      const c = (textOf(tds.eq(idxCred)) ?? "").trim();
      if (/^\d+$/.test(c)) creditos = Number(c);
    }

    courses.push({ nrc, clave, materia, creditos });
  });

  if (!courses.length) {
    throw new Error("No se extrajo ningún curso desde Lista (vacío).");
  }

  return { courses };
}