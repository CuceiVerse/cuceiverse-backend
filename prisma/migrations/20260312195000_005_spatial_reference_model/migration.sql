-- CreateEnum
CREATE TYPE "CampusZona" AS ENUM ('SUR', 'CENTRAL', 'NOROESTE', 'ESTE_NORESTE', 'DEPORTIVA');

-- CreateEnum
CREATE TYPE "EdificioTipo" AS ENUM (
  'EDIFICIO_ACADEMICO',
  'ZONA_CLAVE',
  'INSTALACION_DEPORTIVA',
  'SERVICIO',
  'LANDMARK'
);

-- Create new POI enum with the campus taxonomy.
CREATE TYPE "PuntoInteresTipo_new" AS ENUM (
  'BANOS',
  'CAFETERIAS',
  'CONTROL_ESCOLAR',
  'MEDICO',
  'PAPELERIAS',
  'CAJERO_SANTANDER',
  'AUDITORIOS'
);

-- CreateTable
CREATE TABLE "edificios" (
  "id" TEXT NOT NULL,
  "codigo" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "tipo" "EdificioTipo" NOT NULL,
  "zona" "CampusZona" NOT NULL,
  "bounding_box" JSONB NOT NULL,
  "centroid_x" INTEGER,
  "centroid_y" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "edificios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "path_nodes" (
  "id" TEXT NOT NULL,
  "coord_x" INTEGER NOT NULL,
  "coord_y" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "path_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "path_edges" (
  "id" TEXT NOT NULL,
  "node_a_id" TEXT NOT NULL,
  "node_b_id" TEXT NOT NULL,
  "peso" INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT "path_edges_pkey" PRIMARY KEY ("id")
);

-- Add POI relation fields.
ALTER TABLE "puntos_interes"
  ADD COLUMN "edificio_id" TEXT,
  ADD COLUMN "nearest_path_node_id" TEXT;

-- Convert existing enum values into the new campus taxonomy.
ALTER TABLE "puntos_interes"
  ALTER COLUMN "tipo" TYPE TEXT USING ("tipo"::text);

UPDATE "puntos_interes"
SET "tipo" = CASE "tipo"
  WHEN 'FOOD' THEN 'CAFETERIAS'
  WHEN 'MEDICAL' THEN 'MEDICO'
  WHEN 'BATHROOM' THEN 'BANOS'
  WHEN 'CAFETERIA' THEN 'CAFETERIAS'
  WHEN 'GENERAL_SERVICES' THEN 'PAPELERIAS'
  WHEN 'AUDITORIUM' THEN 'AUDITORIOS'
  WHEN 'BANK' THEN 'CAJERO_SANTANDER'
  WHEN 'LIBRARY' THEN 'CONTROL_ESCOLAR'
  WHEN 'INFO' THEN 'CONTROL_ESCOLAR'
  WHEN 'ADMIN' THEN 'CONTROL_ESCOLAR'
  ELSE 'CONTROL_ESCOLAR'
END;

ALTER TYPE "PuntoInteresTipo" RENAME TO "PuntoInteresTipo_old";
ALTER TYPE "PuntoInteresTipo_new" RENAME TO "PuntoInteresTipo";

ALTER TABLE "puntos_interes"
  ALTER COLUMN "tipo" TYPE "PuntoInteresTipo"
  USING ("tipo"::"PuntoInteresTipo");

DROP TYPE "PuntoInteresTipo_old";

-- Drop old walkway graph tables created in the previous draft migration.
DROP TABLE IF EXISTS "aristas_pasillo";
DROP TABLE IF EXISTS "nodos_pasillo";

-- Indexes
CREATE UNIQUE INDEX "edificios_codigo_key" ON "edificios"("codigo");
CREATE INDEX "edificios_zona_tipo_idx" ON "edificios"("zona", "tipo");
CREATE UNIQUE INDEX "path_nodes_coord_x_coord_y_key" ON "path_nodes"("coord_x", "coord_y");
CREATE INDEX "path_edges_node_a_id_idx" ON "path_edges"("node_a_id");
CREATE INDEX "path_edges_node_b_id_idx" ON "path_edges"("node_b_id");
CREATE UNIQUE INDEX "path_edges_node_a_id_node_b_id_key" ON "path_edges"("node_a_id", "node_b_id");
CREATE INDEX "puntos_interes_nearest_path_node_id_idx" ON "puntos_interes"("nearest_path_node_id");
CREATE INDEX "puntos_interes_edificio_id_idx" ON "puntos_interes"("edificio_id");

-- Foreign keys
ALTER TABLE "puntos_interes"
  ADD CONSTRAINT "puntos_interes_edificio_id_fkey"
  FOREIGN KEY ("edificio_id") REFERENCES "edificios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "puntos_interes"
  ADD CONSTRAINT "puntos_interes_nearest_path_node_id_fkey"
  FOREIGN KEY ("nearest_path_node_id") REFERENCES "path_nodes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "path_edges"
  ADD CONSTRAINT "path_edges_node_a_id_fkey"
  FOREIGN KEY ("node_a_id") REFERENCES "path_nodes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "path_edges"
  ADD CONSTRAINT "path_edges_node_b_id_fkey"
  FOREIGN KEY ("node_b_id") REFERENCES "path_nodes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
