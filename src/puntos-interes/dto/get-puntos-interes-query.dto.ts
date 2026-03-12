import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

import {
  puntoInteresTypeSlugs,
  type PuntoInteresTypeSlug,
} from '../punto-interes.constants';

function toOptionalTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toOptionalBoolean(value: unknown): unknown {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim().toLowerCase();
  if (normalized === '') return undefined;
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;

  return value;
}

function toOptionalInteger(value: unknown): unknown {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim();
  if (normalized === '') return undefined;

  return Number(normalized);
}

export class GetPuntosInteresQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    const normalized = toOptionalTrimmedString(value);
    return normalized?.toLowerCase();
  })
  @IsIn(puntoInteresTypeSlugs)
  tipo?: PuntoInteresTypeSlug;

  @IsOptional()
  @Transform(({ value }) => {
    const normalized = toOptionalTrimmedString(value);
    return normalized?.toUpperCase();
  })
  @Matches(/^[A-Z][A-Z0-9]{0,3}$/)
  edificio?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @Transform(({ value }) => toOptionalInteger(value))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
