import { Transform } from 'class-transformer';
import { IsNumber } from 'class-validator';

function toNumber(value: unknown): unknown {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  if (normalized === '') return value;
  return Number(normalized);
}

export class GetNearestPathNodeQueryDto {
  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  x: number;

  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  y: number;
}
