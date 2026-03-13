import { PuntoInteresTipo } from '../generated/prisma';

export const puntoInteresTypeMap = {
  bathroom: PuntoInteresTipo.BANOS,
  banos: PuntoInteresTipo.BANOS,
  cafeteria: PuntoInteresTipo.CAFETERIAS,
  food: PuntoInteresTipo.CAFETERIAS,
  control_escolar: PuntoInteresTipo.CONTROL_ESCOLAR,
  medical: PuntoInteresTipo.MEDICO,
  medico: PuntoInteresTipo.MEDICO,
  papelerias: PuntoInteresTipo.PAPELERIAS,
  general_services: PuntoInteresTipo.PAPELERIAS,
  cajero_santander: PuntoInteresTipo.CAJERO_SANTANDER,
  bank: PuntoInteresTipo.CAJERO_SANTANDER,
  auditorium: PuntoInteresTipo.AUDITORIOS,
  auditorios: PuntoInteresTipo.AUDITORIOS,
  admin: PuntoInteresTipo.CONTROL_ESCOLAR,
  info: PuntoInteresTipo.CONTROL_ESCOLAR,
  library: PuntoInteresTipo.CONTROL_ESCOLAR,
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
  const canonicalByType: Record<PuntoInteresTipo, PuntoInteresTypeSlug> = {
    [PuntoInteresTipo.BANOS]: 'bathroom',
    [PuntoInteresTipo.CAFETERIAS]: 'cafeteria',
    [PuntoInteresTipo.CONTROL_ESCOLAR]: 'admin',
    [PuntoInteresTipo.MEDICO]: 'medical',
    [PuntoInteresTipo.PAPELERIAS]: 'general_services',
    [PuntoInteresTipo.CAJERO_SANTANDER]: 'bank',
    [PuntoInteresTipo.AUDITORIOS]: 'auditorium',
  };

  const found = canonicalByType[tipo];

  if (!found) {
    throw new Error(`Unsupported PuntoInteresTipo: ${tipo}`);
  }

  return found;
}
