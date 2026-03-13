-- CreateEnum
CREATE TYPE "CampusAreaTipo" AS ENUM (
  'PERIMETRO_CAMPUS',
  'JARDIN',
  'EXPLANADA',
  'PASILLO_PEATONAL',
  'AREA_DEPORTIVA',
  'ESTACIONAMIENTO'
);

-- CreateEnum
CREATE TYPE "CampusAssetTipo" AS ENUM (
  'ARBOL',
  'ARBUSTO',
  'BANCA',
  'LUMINARIA',
  'BASURERO'
);

-- CreateTable
CREATE TABLE "campus_areas" (
  "id" TEXT NOT NULL,
  "codigo" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "tipo" "CampusAreaTipo" NOT NULL,
  "bounding_box" JSONB NOT NULL,
  "centroid_x" INTEGER,
  "centroid_y" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "campus_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campus_assets" (
  "id" TEXT NOT NULL,
  "tipo" "CampusAssetTipo" NOT NULL,
  "nombre" TEXT,
  "coord_x" INTEGER NOT NULL,
  "coord_y" INTEGER NOT NULL,
  "orientacion_deg" INTEGER,
  "metadata" JSONB,
  "area_id" TEXT,
  "nearest_path_node_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "campus_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campus_areas_codigo_key" ON "campus_areas"("codigo");

-- CreateIndex
CREATE INDEX "campus_areas_tipo_idx" ON "campus_areas"("tipo");

-- CreateIndex
CREATE INDEX "campus_assets_tipo_idx" ON "campus_assets"("tipo");

-- CreateIndex
CREATE INDEX "campus_assets_area_id_idx" ON "campus_assets"("area_id");

-- CreateIndex
CREATE INDEX "campus_assets_nearest_path_node_id_idx" ON "campus_assets"("nearest_path_node_id");

-- CreateIndex
CREATE UNIQUE INDEX "campus_assets_tipo_coord_x_coord_y_key" ON "campus_assets"("tipo", "coord_x", "coord_y");

-- AddForeignKey
ALTER TABLE "campus_assets"
ADD CONSTRAINT "campus_assets_area_id_fkey"
FOREIGN KEY ("area_id") REFERENCES "campus_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campus_assets"
ADD CONSTRAINT "campus_assets_nearest_path_node_id_fkey"
FOREIGN KEY ("nearest_path_node_id") REFERENCES "path_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
