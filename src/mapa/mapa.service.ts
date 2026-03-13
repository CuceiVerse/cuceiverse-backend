import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma';

import { PrismaService } from '../prisma/prisma.service';
import { toPuntoInteresTipo } from '../puntos-interes/punto-interes.constants';
import type {
  SyncElementoDto,
  SyncAristaDto,
  SyncMapaDto,
  SyncNodoDto,
  SyncPoiDto,
} from './dto/sync-mapa.dto';
import type {
  ModularMapLayoutEnvelope,
  ModularMapLayoutPayload,
} from './modular-layout.types';
import type { UpsertElementoDto } from './dto/upsert-elemento.dto';

type TxClient = Omit<
  PrismaService,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

type OpStats = { created: number; updated: number; deleted: number };
type NodeStats = { created: number; deleted: number };

const MODULAR_LAYOUT_DIR = join(
  process.cwd(),
  'storage',
  'modular-layouts',
);

function nearestNodeIdFromNodes(
  nodes: Array<{ id: string; coordX: number; coordY: number }>,
  x: number,
  y: number,
) {
  if (nodes.length === 0) return null;
  let bestNode = nodes[0];
  let bestDistance = Math.hypot(bestNode.coordX - x, bestNode.coordY - y);
  for (let i = 1; i < nodes.length; i += 1) {
    const node = nodes[i];
    const distance = Math.hypot(node.coordX - x, node.coordY - y);
    if (distance < bestDistance) {
      bestNode = node;
      bestDistance = distance;
    }
  }
  return bestNode.id;
}

@Injectable()
export class MapaService {
  constructor(private readonly prisma: PrismaService) {}

  async cargarLayoutModular(mapId: string): Promise<ModularMapLayoutEnvelope> {
    const filePath = this.getModularLayoutPath(mapId);
    const raw = await readFile(filePath, 'utf8');
    const fileInfo = await stat(filePath);
    const data = this.parseModularLayout(raw, mapId);

    return {
      ok: true,
      data,
      meta: {
        source: 'filesystem',
        savedAt: fileInfo.mtime.toISOString(),
        path: filePath,
      },
    };
  }

  async guardarLayoutModular(
    mapId: string,
    payload: ModularMapLayoutPayload,
  ): Promise<ModularMapLayoutEnvelope> {
    this.assertValidModularLayout(payload, mapId);
    await mkdir(MODULAR_LAYOUT_DIR, { recursive: true });

    const normalizedPayload: ModularMapLayoutPayload = {
      ...payload,
      mapId,
      buildings: [...payload.buildings].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
      paths: [...payload.paths].sort(
        (left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x,
      ),
      props: [...payload.props].sort(
        (left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x,
      ),
    };

    const filePath = this.getModularLayoutPath(mapId);
    await writeFile(filePath, `${JSON.stringify(normalizedPayload, null, 2)}\n`, 'utf8');
    const fileInfo = await stat(filePath);

    return {
      ok: true,
      data: normalizedPayload,
      meta: {
        source: 'filesystem',
        savedAt: fileInfo.mtime.toISOString(),
        path: filePath,
      },
    };
  }

  async listarEdificios() {
    const edificios = await this.prisma.edificio.findMany({
      orderBy: [{ zona: 'asc' }, { codigo: 'asc' }],
      select: {
        id: true,
        codigo: true,
        nombre: true,
        tipo: true,
        zona: true,
        boundingBox: true,
        centroidX: true,
        centroidY: true,
      },
    });

    return {
      data: edificios,
      meta: { total: edificios.length },
    };
  }

  async listarAreas() {
    const areas = await this.prisma.campusArea.findMany({
      orderBy: [{ tipo: 'asc' }, { codigo: 'asc' }],
      select: {
        id: true,
        codigo: true,
        nombre: true,
        tipo: true,
        boundingBox: true,
        centroidX: true,
        centroidY: true,
      },
    });

    return {
      data: areas,
      meta: { total: areas.length },
    };
  }

  async listarMobiliario() {
    const assets = await this.prisma.campusAsset.findMany({
      orderBy: [{ tipo: 'asc' }, { coordY: 'asc' }, { coordX: 'asc' }],
      select: {
        id: true,
        tipo: true,
        nombre: true,
        coordX: true,
        coordY: true,
        orientacionDeg: true,
        areaId: true,
        nearestPathNodeId: true,
      },
    });

    return {
      data: assets,
      meta: { total: assets.length },
    };
  }

  async recalcularNearestPathNodes(poiIds?: string[]) {
    const nodes = await this.prisma.pathNode.findMany({
      select: { id: true, coordX: true, coordY: true },
    });

    if (nodes.length === 0) {
      throw new BadRequestException(
        'No existen nodos de pasillo para recalcular',
      );
    }

    const pois = await this.prisma.puntoInteres.findMany({
      where: poiIds?.length ? { id: { in: poiIds } } : undefined,
      select: {
        id: true,
        coordenadaXGrid: true,
        coordenadaYGrid: true,
      },
    });

    const nearestNodeId = (x: number, y: number) => {
      let bestNode = nodes[0];
      let bestDistance = Math.hypot(bestNode.coordX - x, bestNode.coordY - y);

      for (let i = 1; i < nodes.length; i += 1) {
        const node = nodes[i];
        const distance = Math.hypot(node.coordX - x, node.coordY - y);
        if (distance < bestDistance) {
          bestNode = node;
          bestDistance = distance;
        }
      }

      return { nodeId: bestNode.id, distance: bestDistance };
    };

    let updated = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const poi of pois) {
        const nearest = nearestNodeId(poi.coordenadaXGrid, poi.coordenadaYGrid);
        await tx.puntoInteres.update({
          where: { id: poi.id },
          data: { nearestPathNodeId: nearest.nodeId },
        });
        updated += 1;
      }
    });

    return {
      ok: true,
      stats: {
        processed: pois.length,
        updated,
      },
    };
  }

  async sync(dto: SyncMapaDto) {
    const poiStats: OpStats = { created: 0, updated: 0, deleted: 0 };
    const nodoStats: NodeStats = { created: 0, deleted: 0 };
    const aristaStats: NodeStats = { created: 0, deleted: 0 };
    const elementoStats: OpStats = { created: 0, updated: 0, deleted: 0 };

    await this.prisma.$transaction(async (tx) => {
      for (const poi of dto.pois ?? []) {
        await this.applyPoiOp(tx as unknown as TxClient, poi, poiStats);
      }

      for (const nodo of dto.nodos ?? []) {
        await this.applyNodoOp(tx as unknown as TxClient, nodo, nodoStats);
      }

      for (const arista of dto.aristas ?? []) {
        await this.applyAristaOp(
          tx as unknown as TxClient,
          arista,
          aristaStats,
        );
      }

      for (const elemento of dto.elementos ?? []) {
        await this.applyElementoOp(
          tx as unknown as TxClient,
          elemento,
          elementoStats,
        );
      }
    });

    return {
      ok: true,
      stats: {
        pois: poiStats,
        nodos: nodoStats,
        aristas: aristaStats,
        elementos: elementoStats,
      },
    };
  }

  async actualizarElemento(id: string, dto: UpsertElementoDto) {
    const existing = await this.prisma.campusAsset.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new BadRequestException('Elemento no existe');
    }

    const hasCoord = dto.coordX != null && dto.coordY != null;
    let nearestPathNodeId = dto.nearestPathNodeId;

    if (hasCoord && !nearestPathNodeId) {
      const nodes = await this.prisma.pathNode.findMany({
        select: { id: true, coordX: true, coordY: true },
      });
      nearestPathNodeId = nearestNodeIdFromNodes(nodes, dto.coordX!, dto.coordY!) ?? undefined;
    }

    const updated = await this.prisma.campusAsset.update({
      where: { id },
      data: {
        tipo: dto.tipo,
        nombre: dto.nombre,
        coordX: dto.coordX,
        coordY: dto.coordY,
        orientacionDeg: dto.orientacionDeg,
        areaId: dto.areaId,
        nearestPathNodeId,
      },
      select: {
        id: true,
        tipo: true,
        nombre: true,
        coordX: true,
        coordY: true,
        orientacionDeg: true,
        areaId: true,
        nearestPathNodeId: true,
      },
    });

    return { ok: true, data: updated };
  }

  async eliminarElemento(id: string) {
    await this.prisma.campusAsset.delete({ where: { id } });
    return { ok: true, deletedId: id };
  }

  private getModularLayoutPath(mapId: string): string {
    const safeMapId = mapId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    return join(MODULAR_LAYOUT_DIR, `${safeMapId}.json`);
  }

  private parseModularLayout(raw: string, mapId: string): ModularMapLayoutPayload {
    let payload: unknown;

    try {
      payload = JSON.parse(raw);
    } catch {
      throw new BadRequestException(
        `El layout modular almacenado para ${mapId} no es JSON válido`,
      );
    }

    this.assertValidModularLayout(payload, mapId);
    return payload;
  }

  private assertValidModularLayout(
    payload: unknown,
    mapId: string,
  ): asserts payload is ModularMapLayoutPayload {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('El payload del layout modular debe ser un objeto');
    }

    const candidate = payload as Record<string, unknown>;

    if (candidate['schemaVersion'] !== 'modular-map@1') {
      throw new BadRequestException('schemaVersion inválido para layout modular');
    }

    if (candidate['mapId'] !== mapId) {
      throw new BadRequestException('mapId del payload no coincide con la ruta');
    }

    if (!candidate['grid'] || typeof candidate['grid'] !== 'object') {
      throw new BadRequestException('grid es requerido en el layout modular');
    }

    if (!Array.isArray(candidate['buildings'])) {
      throw new BadRequestException('buildings debe ser un arreglo');
    }

    if (!Array.isArray(candidate['paths'])) {
      throw new BadRequestException('paths debe ser un arreglo');
    }

    if (!Array.isArray(candidate['props'])) {
      throw new BadRequestException('props debe ser un arreglo');
    }
  }

  // ─── POIs ────────────────────────────────────────────────────────────────

  private async applyPoiOp(
    tx: TxClient,
    dto: SyncPoiDto,
    stats: OpStats,
  ): Promise<void> {
    if (dto.op === 'create') {
      if (
        !dto.nombre ||
        !dto.tipo ||
        dto.coordenadaXGrid == null ||
        dto.coordenadaYGrid == null
      ) {
        throw new BadRequestException(
          'nombre, tipo, coordenadaXGrid y coordenadaYGrid son requeridos para op=create',
        );
      }

      await tx.puntoInteres.create({
        data: {
          nombre: dto.nombre,
          tipo: toPuntoInteresTipo(dto.tipo),
          coordenadaXGrid: dto.coordenadaXGrid,
          coordenadaYGrid: dto.coordenadaYGrid,
          descripcion: dto.descripcion ?? null,
          edificioId: dto.edificioId ?? null,
          edificioReferencia: dto.edificioReferencia ?? null,
          nearestPathNodeId: dto.nearestPathNodeId ?? null,
          prioridadVisual: dto.prioridadVisual ?? 0,
        },
      });

      stats.created++;
      return;
    }

    if (!dto.id) {
      throw new BadRequestException(`id es requerido para op=${dto.op}`);
    }

    if (dto.op === 'update') {
      const data: Prisma.PuntoInteresUncheckedUpdateInput = {};
      if (dto.nombre) data.nombre = dto.nombre;
      if (dto.tipo) data.tipo = toPuntoInteresTipo(dto.tipo);
      if (dto.coordenadaXGrid != null)
        data.coordenadaXGrid = dto.coordenadaXGrid;
      if (dto.coordenadaYGrid != null)
        data.coordenadaYGrid = dto.coordenadaYGrid;
      if (dto.descripcion !== undefined) data.descripcion = dto.descripcion;
      if (dto.edificioId !== undefined) data.edificioId = dto.edificioId;
      if (dto.edificioReferencia !== undefined)
        data.edificioReferencia = dto.edificioReferencia;
      if (dto.nearestPathNodeId !== undefined)
        data.nearestPathNodeId = dto.nearestPathNodeId;
      if (dto.prioridadVisual != null)
        data.prioridadVisual = dto.prioridadVisual;

      await tx.puntoInteres.update({ where: { id: dto.id }, data });
      stats.updated++;
      return;
    }

    // delete
    await tx.puntoInteres.delete({ where: { id: dto.id } });
    stats.deleted++;
  }

  // ─── Nodos pasillo ───────────────────────────────────────────────────────

  private async applyNodoOp(
    tx: TxClient,
    dto: SyncNodoDto,
    stats: NodeStats,
  ): Promise<void> {
    if (dto.op === 'create') {
      if (dto.xGrid == null || dto.yGrid == null) {
        throw new BadRequestException(
          'xGrid e yGrid son requeridos para op=create',
        );
      }

      await tx.pathNode.create({
        data: { coordX: dto.xGrid, coordY: dto.yGrid },
      });
      stats.created++;
      return;
    }

    if (!dto.id) {
      throw new BadRequestException('id es requerido para op=delete');
    }

    await tx.pathNode.delete({ where: { id: dto.id } });
    stats.deleted++;
  }

  // ─── Aristas pasillo ─────────────────────────────────────────────────────

  private async applyAristaOp(
    tx: TxClient,
    dto: SyncAristaDto,
    stats: NodeStats,
  ): Promise<void> {
    if (dto.op === 'create') {
      if (!dto.nodeAId || !dto.nodeBId) {
        throw new BadRequestException(
          'nodeAId y nodeBId son requeridos para op=create',
        );
      }

      await tx.pathEdge.create({
        data: {
          nodeAId: dto.nodeAId,
          nodeBId: dto.nodeBId,
          peso: dto.peso ?? 1,
        },
      });
      stats.created++;
      return;
    }

    if (!dto.id) {
      throw new BadRequestException('id es requerido para op=delete');
    }

    await tx.pathEdge.delete({ where: { id: dto.id } });
    stats.deleted++;
  }

  // ─── Elementos de mapa (mobiliario / vegetación) ────────────────────────

  private async applyElementoOp(
    tx: TxClient,
    dto: SyncElementoDto,
    stats: OpStats,
  ): Promise<void> {
    if (dto.op === 'create') {
      if (!dto.tipo || dto.coordX == null || dto.coordY == null) {
        throw new BadRequestException(
          'tipo, coordX y coordY son requeridos para op=create de elementos',
        );
      }

      const nodes = await tx.pathNode.findMany({
        select: { id: true, coordX: true, coordY: true },
      });
      const nearestPathNodeId =
        dto.nearestPathNodeId ??
        nearestNodeIdFromNodes(nodes, dto.coordX, dto.coordY) ??
        null;

      await tx.campusAsset.create({
        data: {
          tipo: dto.tipo,
          nombre: dto.nombre ?? null,
          coordX: dto.coordX,
          coordY: dto.coordY,
          orientacionDeg: dto.orientacionDeg ?? null,
          areaId: dto.areaId ?? null,
          nearestPathNodeId,
        },
      });

      stats.created++;
      return;
    }

    if (!dto.id) {
      throw new BadRequestException(`id es requerido para op=${dto.op} en elementos`);
    }

    if (dto.op === 'update') {
      let nearestPathNodeId = dto.nearestPathNodeId;
      if (dto.coordX != null && dto.coordY != null && !nearestPathNodeId) {
        const nodes = await tx.pathNode.findMany({
          select: { id: true, coordX: true, coordY: true },
        });
        nearestPathNodeId = nearestNodeIdFromNodes(nodes, dto.coordX, dto.coordY) ?? undefined;
      }

      await tx.campusAsset.update({
        where: { id: dto.id },
        data: {
          tipo: dto.tipo,
          nombre: dto.nombre,
          coordX: dto.coordX,
          coordY: dto.coordY,
          orientacionDeg: dto.orientacionDeg,
          areaId: dto.areaId,
          nearestPathNodeId,
        },
      });

      stats.updated++;
      return;
    }

    await tx.campusAsset.delete({ where: { id: dto.id } });
    stats.deleted++;
  }
}
