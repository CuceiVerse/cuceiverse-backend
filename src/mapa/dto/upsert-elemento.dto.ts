import { IsIn, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpsertElementoDto {
  @IsOptional()
  @IsIn(['ARBOL', 'ARBUSTO', 'BANCA', 'LUMINARIA', 'BASURERO'])
  tipo?: 'ARBOL' | 'ARBUSTO' | 'BANCA' | 'LUMINARIA' | 'BASURERO';

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsInt()
  coordX?: number;

  @IsOptional()
  @IsInt()
  coordY?: number;

  @IsOptional()
  @IsInt()
  orientacionDeg?: number;

  @IsOptional()
  @IsUUID()
  areaId?: string;

  @IsOptional()
  @IsUUID()
  nearestPathNodeId?: string;
}
