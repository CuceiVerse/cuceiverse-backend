import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { PuntosInteresController } from './puntos-interes.controller';
import { PuntosInteresService } from './puntos-interes.service';

@Module({
  imports: [PrismaModule],
  controllers: [PuntosInteresController],
  providers: [PuntosInteresService],
})
export class PuntosInteresModule {}