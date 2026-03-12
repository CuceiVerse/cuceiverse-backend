import { Controller, Get, Query } from '@nestjs/common';

import { GetPuntosInteresQueryDto } from './dto/get-puntos-interes-query.dto';
import { PuntosInteresService } from './puntos-interes.service';

@Controller('puntos-interes')
export class PuntosInteresController {
  constructor(private readonly puntosInteres: PuntosInteresService) {}

  @Get()
  findAll(@Query() query: GetPuntosInteresQueryDto) {
    return this.puntosInteres.findAll(query);
  }
}