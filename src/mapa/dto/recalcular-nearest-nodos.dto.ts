import { ArrayMaxSize, IsArray, IsOptional, IsUUID } from 'class-validator';

export class RecalcularNearestNodosDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5000)
  @IsUUID('4', { each: true })
  poiIds?: string[];
}
