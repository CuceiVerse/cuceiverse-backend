import { PuntoInteresTipo } from '../generated/prisma';

export const puntoInteresTypeMap = {
  food: PuntoInteresTipo.FOOD,
  medical: PuntoInteresTipo.MEDICAL,
  bathroom: PuntoInteresTipo.BATHROOM,
  cafeteria: PuntoInteresTipo.CAFETERIA,
  general_services: PuntoInteresTipo.GENERAL_SERVICES,
  auditorium: PuntoInteresTipo.AUDITORIUM,
  bank: PuntoInteresTipo.BANK,
  library: PuntoInteresTipo.LIBRARY,
  info: PuntoInteresTipo.INFO,
  admin: PuntoInteresTipo.ADMIN,
} as const;

export type PuntoInteresTypeSlug = keyof typeof puntoInteresTypeMap;

export const puntoInteresTypeSlugs = Object.freeze(
  Object.keys(puntoInteresTypeMap) as PuntoInteresTypeSlug[],
);

export function toPuntoInteresTipo(
  slug: PuntoInteresTypeSlug,
): PuntoInteresTipo {
  return puntoInteresTypeMap[slug];
}

export function fromPuntoInteresTipo(
  tipo: PuntoInteresTipo,
): PuntoInteresTypeSlug {
  const found = puntoInteresTypeSlugs.find(
    (slug) => puntoInteresTypeMap[slug] === tipo,
  );

  if (!found) {
    throw new Error(`Unsupported PuntoInteresTipo: ${tipo}`);
  }

  return found;
}