import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { SiiauModule } from './siiau/siiau.module';
import { PuntosInteresModule } from './puntos-interes/puntos-interes.module';
import { MapaModule } from './mapa/mapa.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SiiauModule,
    PuntosInteresModule,
    MapaModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
