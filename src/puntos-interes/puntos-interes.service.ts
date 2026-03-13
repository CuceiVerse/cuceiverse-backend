import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma';
import { GetPuntosInteresQueryDto } from './dto/get-puntos-interes-query.dto';
import {
  fromPuntoInteresTipo,
  toPuntoInteresTipo,
} from './punto-interes.constants';

type PuntoInteresResponse = {
  id: string;
  nombre: string;
  tipo: string;
  coordenadaXGrid: number;
  coordenadaYGrid: number;
  descripcion: string | null;
  activo: boolean;
  edificioReferencia: string | null;
  nearestPathNodeId: string | null;
  prioridadVisual: number;
};

@Injectable()
export class PuntosInteresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GetPuntosInteresQueryDto) {
    const where: Prisma.PuntoInteresWhereInput = {};

    if (query.tipo) {
      where.tipo = toPuntoInteresTipo(query.tipo);
    }

    if (query.edificio) {
      where.edificioReferencia = query.edificio;
    }

    if (typeof query.activo === 'boolean') {
      where.activo = query.activo;
    }

    const puntos = await this.prisma.puntoInteres.findMany({
      where,
      take: query.limit ?? 150,
      orderBy: [{ prioridadVisual: 'desc' }, { nombre: 'asc' }],
    });

    return {
      data: puntos.map<PuntoInteresResponse>((punto) => ({
        id: punto.id,
        nombre: punto.nombre,
        tipo: fromPuntoInteresTipo(punto.tipo),
        coordenadaXGrid: punto.coordenadaXGrid,
        coordenadaYGrid: punto.coordenadaYGrid,
        descripcion: punto.descripcion,
        activo: punto.activo,
        edificioReferencia: punto.edificioReferencia,
        nearestPathNodeId: punto.nearestPathNodeId,
        prioridadVisual: punto.prioridadVisual,
      })),
      meta: {
        total: puntos.length,
        filtros: {
          tipo: query.tipo ?? null,
          edificio: query.edificio ?? null,
          activo: typeof query.activo === 'boolean' ? query.activo : null,
          limit: query.limit ?? 150,
        },
      },
    };
  }
}
