import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { GetNearestPathNodeQueryDto } from './dto/get-nearest-path-node-query.dto';
import { GetRutaQueryDto } from './dto/get-ruta-query.dto';
import { RecalcularNearestNodosDto } from './dto/recalcular-nearest-nodos.dto';
import { SyncMapaDto } from './dto/sync-mapa.dto';
import { UpsertElementoDto } from './dto/upsert-elemento.dto';
import { MapaService } from './mapa.service';
import type { ModularMapLayoutPayload } from './modular-layout.types';
import { PathfindingService } from './pathfinding.service';

@Controller('mapa')
export class MapaController {
  constructor(
    private readonly mapaService: MapaService,
    private readonly pathfindingService: PathfindingService,
  ) {}

  @Get('edificios')
  @UseGuards(JwtAuthGuard, AdminGuard)
  edificios() {
    return this.mapaService.listarEdificios();
  }

  @Get('areas')
  @UseGuards(JwtAuthGuard, AdminGuard)
  areas() {
    return this.mapaService.listarAreas();
  }

  @Get('mobiliario')
  @UseGuards(JwtAuthGuard, AdminGuard)
  mobiliario() {
    return this.mapaService.listarMobiliario();
  }

  @Get('grafo')
  @UseGuards(JwtAuthGuard, AdminGuard)
  obtenerGrafo() {
    return this.pathfindingService.obtenerGrafo();
  }

  @Get('nodo-mas-cercano')
  @UseGuards(JwtAuthGuard, AdminGuard)
  nodoMasCercano(@Query() query: GetNearestPathNodeQueryDto) {
    return this.pathfindingService.encontrarNodoMasCercano(query.x, query.y);
  }

  @Get('ruta')
  @UseGuards(JwtAuthGuard)
  calcularRuta(@Query() query: GetRutaQueryDto) {
    return this.pathfindingService.calcularRuta(
      query.poiOrigenId,
      query.poiDestinoId,
    );
  }

  @Get('layout-modular/:mapId')
  @UseGuards(JwtAuthGuard)
  obtenerLayoutModular(@Param('mapId') mapId: string) {
    return this.mapaService.cargarLayoutModular(mapId);
  }

  @Put('layout-modular/:mapId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  guardarLayoutModular(
    @Param('mapId') mapId: string,
    @Body() payload: ModularMapLayoutPayload,
  ) {
    return this.mapaService.guardarLayoutModular(mapId, payload);
  }

  /**
   * POST /mapa/sync
   *
   * Aplica un conjunto de operaciones (create / update / delete) sobre POIs,
   * nodos de pasillo y aristas de pasillo dentro de una única transacción.
   *
   * Requiere: JWT válido + rol is_admin=true.
   */
  @Post('sync')
  @UseGuards(JwtAuthGuard, AdminGuard)
  sync(@Body() dto: SyncMapaDto) {
    return this.mapaService.sync(dto);
  }

  @Put('elemento/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  actualizarElemento(@Param('id') id: string, @Body() dto: UpsertElementoDto) {
    return this.mapaService.actualizarElemento(id, dto);
  }

  @Delete('elemento/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  eliminarElemento(@Param('id') id: string) {
    return this.mapaService.eliminarElemento(id);
  }

  @Post('recalcular-nearest-nodos')
  @UseGuards(JwtAuthGuard, AdminGuard)
  recalcularNearestNodos(@Body() dto: RecalcularNearestNodosDto) {
    return this.mapaService.recalcularNearestPathNodes(dto.poiIds);
  }
}
