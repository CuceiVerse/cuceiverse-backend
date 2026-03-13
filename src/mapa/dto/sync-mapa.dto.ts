import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  puntoInteresTypeSlugs,
  type PuntoInteresTypeSlug,
} from '../../puntos-interes/punto-interes.constants';

export class SyncPoiDto {
  @IsIn(['create', 'update', 'delete'])
  op: 'create' | 'update' | 'delete';

  /** Requerido para op=update y op=delete */
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsIn([...puntoInteresTypeSlugs])
  tipo?: PuntoInteresTypeSlug;

  @IsOptional()
  @IsInt()
  coordenadaXGrid?: number;

  @IsOptional()
  @IsInt()
  coordenadaYGrid?: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsUUID()
  edificioId?: string;

  @IsOptional()
  @IsString()
  edificioReferencia?: string;

  @IsOptional()
  @IsUUID()
  nearestPathNodeId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  prioridadVisual?: number;
}

export class SyncNodoDto {
  @IsIn(['create', 'delete'])
  op: 'create' | 'delete';

  /** Requerido para op=delete */
  @IsOptional()
  @IsUUID()
  id?: string;

  /** Requerido para op=create */
  @IsOptional()
  @IsInt()
  xGrid?: number;

  @IsOptional()
  @IsInt()
  yGrid?: number;
}

export class SyncAristaDto {
  @IsIn(['create', 'delete'])
  op: 'create' | 'delete';

  @IsOptional()
  @IsUUID()
  id?: string;

  /** Requerido para op=create */
  @IsOptional()
  @IsUUID()
  nodeAId?: string;

  @IsOptional()
  @IsUUID()
  nodeBId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  peso?: number;
}

export class SyncElementoDto {
  @IsIn(['create', 'update', 'delete'])
  op: 'create' | 'update' | 'delete';

  @IsOptional()
  @IsUUID()
  id?: string;

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

export class SyncMapaDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncPoiDto)
  pois?: SyncPoiDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncNodoDto)
  nodos?: SyncNodoDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncAristaDto)
  aristas?: SyncAristaDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncElementoDto)
  elementos?: SyncElementoDto[];
}
