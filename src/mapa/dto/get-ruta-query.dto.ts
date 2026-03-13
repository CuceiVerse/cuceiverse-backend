import { IsUUID } from 'class-validator';

export class GetRutaQueryDto {
  @IsUUID()
  poiOrigenId: string;

  @IsUUID()
  poiDestinoId: string;
}
