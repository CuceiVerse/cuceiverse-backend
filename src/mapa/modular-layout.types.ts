export type ModularGridCell = {
  x: number;
  y: number;
};

export type ModularMapLayoutPayload = {
  schemaVersion: 'modular-map@1';
  mapId: string;
  grid: {
    columns: number;
    rows: number;
    tileWidth: number;
    tileHeight: number;
    origin: {
      x: number;
      y: number;
    };
  };
  areaCells?: ModularGridCell[];
  buildings: Array<{
    id: string;
    name: string;
    type: string;
    centroid: {
      x: number;
      y: number;
    };
    bounds: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    };
    blocks: Array<{
      id: string;
      anchor: ModularGridCell;
      size: {
        width: number;
        height: number;
      };
    }>;
  }>;
  paths: Array<{
    cell: ModularGridCell;
    material: 'concrete' | 'pavers' | 'grass-transition';
  }>;
  props: Array<{
    id: string;
    kind: string;
    cell: ModularGridCell;
    rotationDeg?: number;
    variant?: string;
    metadata?: Record<string, string>;
  }>;
};

export type ModularMapLayoutEnvelope = {
  ok: true;
  data: ModularMapLayoutPayload;
  meta: {
    source: 'filesystem';
    savedAt: string;
    path: string;
  };
};
