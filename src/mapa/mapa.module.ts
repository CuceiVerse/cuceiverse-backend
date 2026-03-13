import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { MapaController } from './mapa.controller';
import { MapaService } from './mapa.service';
import { PathfindingService } from './pathfinding.service';

@Module({
  imports: [PrismaModule],
  controllers: [MapaController],
  providers: [MapaService, PathfindingService],
  exports: [PathfindingService],
})
export class MapaModule {}
