import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

type GraphNode = {
  id: string;
  x: number;
  y: number;
};

type Neighbor = {
  to: string;
  cost: number;
};

type PoiWithNearestNode = {
  id: string;
  nombre: string;
  coordenadaXGrid: number;
  coordenadaYGrid: number;
  nearestPathNodeId: string | null;
};

type RutaCalculada = {
  poiOrigenId: string;
  poiDestinoId: string;
  distanciaTotal: number;
  nodeIds: string[];
  polyline: Array<{ x: number; y: number }>;
  origen: { x: number; y: number };
  destino: { x: number; y: number };
};

@Injectable()
export class PathfindingService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerGrafo() {
    const [nodesRaw, edgesRaw] = await Promise.all([
      this.prisma.pathNode.findMany({
        select: { id: true, coordX: true, coordY: true },
        orderBy: [{ coordY: 'asc' }, { coordX: 'asc' }],
      }),
      this.prisma.pathEdge.findMany({
        select: { id: true, nodeAId: true, nodeBId: true, peso: true },
      }),
    ]);

    return {
      nodes: nodesRaw.map((node) => ({
        id: node.id,
        x: node.coordX,
        y: node.coordY,
      })),
      edges: edgesRaw.map((edge) => ({
        id: edge.id,
        nodeAId: edge.nodeAId,
        nodeBId: edge.nodeBId,
        peso: edge.peso,
      })),
    };
  }

  async encontrarNodoMasCercano(x: number, y: number) {
    const nodes = await this.prisma.pathNode.findMany({
      select: { id: true, coordX: true, coordY: true },
    });

    if (nodes.length === 0) {
      throw new NotFoundException('No hay nodos en el grafo peatonal');
    }

    let nearest = nodes[0];
    let bestDistance = Math.hypot(nearest.coordX - x, nearest.coordY - y);

    for (let i = 1; i < nodes.length; i += 1) {
      const node = nodes[i];
      const distance = Math.hypot(node.coordX - x, node.coordY - y);
      if (distance < bestDistance) {
        nearest = node;
        bestDistance = distance;
      }
    }

    return {
      node: {
        id: nearest.id,
        x: nearest.coordX,
        y: nearest.coordY,
      },
      distancia: bestDistance,
      query: { x, y },
    };
  }

  /**
   * Calcula la ruta peatonal entre dos POIs usando A* sobre el grafo PathNode / PathEdge.
   *
   * Requisitos:
   * - Ambos POIs deben existir.
   * - Ambos POIs deben tener nearestPathNodeId.
   */
  async calcularRuta(
    poiOrigenId: string,
    poiDestinoId: string,
  ): Promise<RutaCalculada> {
    const [origenPoi, destinoPoi] = await Promise.all([
      this.loadPoiOrThrow(poiOrigenId),
      this.loadPoiOrThrow(poiDestinoId),
    ]);

    if (!origenPoi.nearestPathNodeId || !destinoPoi.nearestPathNodeId) {
      throw new BadRequestException(
        'Los POIs deben tener nearestPathNodeId para calcular una ruta',
      );
    }

    const { nodes, adjacency } = await this.loadGraph();

    const startNode = nodes.get(origenPoi.nearestPathNodeId);
    const goalNode = nodes.get(destinoPoi.nearestPathNodeId);

    if (!startNode || !goalNode) {
      throw new NotFoundException(
        'No se encontraron los nodos de acceso al grafo',
      );
    }

    const nodeIds = this.runAStar(startNode.id, goalNode.id, nodes, adjacency);
    const polyline = nodeIds.map((id) => {
      const node = nodes.get(id);
      if (!node) {
        throw new NotFoundException(`Nodo ${id} no disponible en memoria`);
      }
      return { x: node.x, y: node.y };
    });

    const distanciaTotal = this.measurePolyline(polyline);

    return {
      poiOrigenId: origenPoi.id,
      poiDestinoId: destinoPoi.id,
      distanciaTotal,
      nodeIds,
      polyline,
      origen: {
        x: origenPoi.coordenadaXGrid,
        y: origenPoi.coordenadaYGrid,
      },
      destino: {
        x: destinoPoi.coordenadaXGrid,
        y: destinoPoi.coordenadaYGrid,
      },
    };
  }

  private async loadPoiOrThrow(id: string): Promise<PoiWithNearestNode> {
    const poi = await this.prisma.puntoInteres.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        coordenadaXGrid: true,
        coordenadaYGrid: true,
        nearestPathNodeId: true,
      },
    });

    if (!poi) {
      throw new NotFoundException(`POI ${id} no existe`);
    }

    return poi;
  }

  private async loadGraph(): Promise<{
    nodes: Map<string, GraphNode>;
    adjacency: Map<string, Neighbor[]>;
  }> {
    const [nodesRaw, edgesRaw] = await Promise.all([
      this.prisma.pathNode.findMany({
        select: { id: true, coordX: true, coordY: true },
      }),
      this.prisma.pathEdge.findMany({
        select: { nodeAId: true, nodeBId: true, peso: true },
      }),
    ]);

    const nodes = new Map<string, GraphNode>(
      nodesRaw.map((node) => [
        node.id,
        { id: node.id, x: node.coordX, y: node.coordY },
      ]),
    );

    const adjacency = new Map<string, Neighbor[]>();
    for (const node of nodes.values()) {
      adjacency.set(node.id, []);
    }

    for (const edge of edgesRaw) {
      adjacency.get(edge.nodeAId)?.push({ to: edge.nodeBId, cost: edge.peso });
      adjacency.get(edge.nodeBId)?.push({ to: edge.nodeAId, cost: edge.peso });
    }

    return { nodes, adjacency };
  }

  private runAStar(
    startId: string,
    goalId: string,
    nodes: Map<string, GraphNode>,
    adjacency: Map<string, Neighbor[]>,
  ): string[] {
    const open = new Set<string>([startId]);
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    for (const nodeId of nodes.keys()) {
      gScore.set(nodeId, Number.POSITIVE_INFINITY);
      fScore.set(nodeId, Number.POSITIVE_INFINITY);
    }

    gScore.set(startId, 0);
    fScore.set(startId, this.heuristic(startId, goalId, nodes));

    while (open.size > 0) {
      const current = this.lowestScore(open, fScore);
      if (!current) break;

      if (current === goalId) {
        return this.reconstructPath(cameFrom, current);
      }

      open.delete(current);

      for (const neighbor of adjacency.get(current) ?? []) {
        const tentative =
          (gScore.get(current) ?? Number.POSITIVE_INFINITY) + neighbor.cost;
        if (
          tentative >= (gScore.get(neighbor.to) ?? Number.POSITIVE_INFINITY)
        ) {
          continue;
        }

        cameFrom.set(neighbor.to, current);
        gScore.set(neighbor.to, tentative);
        fScore.set(
          neighbor.to,
          tentative + this.heuristic(neighbor.to, goalId, nodes),
        );
        open.add(neighbor.to);
      }
    }

    throw new NotFoundException('No existe una ruta conectada entre los POIs');
  }

  private heuristic(
    fromId: string,
    toId: string,
    nodes: Map<string, GraphNode>,
  ): number {
    const from = nodes.get(fromId);
    const to = nodes.get(toId);
    if (!from || !to) return 0;
    return Math.hypot(to.x - from.x, to.y - from.y);
  }

  private lowestScore(
    open: Set<string>,
    fScore: Map<string, number>,
  ): string | null {
    let bestNode: string | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const nodeId of open) {
      const score = fScore.get(nodeId) ?? Number.POSITIVE_INFINITY;
      if (score < bestScore) {
        bestScore = score;
        bestNode = nodeId;
      }
    }

    return bestNode;
  }

  private reconstructPath(
    cameFrom: Map<string, string>,
    current: string,
  ): string[] {
    const path = [current];
    let cursor = current;

    while (cameFrom.has(cursor)) {
      cursor = cameFrom.get(cursor)!;
      path.unshift(cursor);
    }

    return path;
  }

  private measurePolyline(points: Array<{ x: number; y: number }>): number {
    if (points.length <= 1) return 0;

    let distance = 0;
    for (let index = 1; index < points.length; index += 1) {
      distance += Math.hypot(
        points[index].x - points[index - 1].x,
        points[index].y - points[index - 1].y,
      );
    }
    return distance;
  }
}
