-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_admin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "nodos_pasillo" (
    "id" TEXT NOT NULL,
    "x_grid" INTEGER NOT NULL,
    "y_grid" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nodos_pasillo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aristas_pasillo" (
    "id" TEXT NOT NULL,
    "desde_id" TEXT NOT NULL,
    "hasta_id" TEXT NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "aristas_pasillo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nodos_pasillo_activo_idx" ON "nodos_pasillo"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "nodos_pasillo_x_grid_y_grid_key" ON "nodos_pasillo"("x_grid", "y_grid");

-- CreateIndex
CREATE UNIQUE INDEX "aristas_pasillo_desde_id_hasta_id_key" ON "aristas_pasillo"("desde_id", "hasta_id");

-- AddForeignKey
ALTER TABLE "aristas_pasillo" ADD CONSTRAINT "aristas_pasillo_desde_id_fkey" FOREIGN KEY ("desde_id") REFERENCES "nodos_pasillo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aristas_pasillo" ADD CONSTRAINT "aristas_pasillo_hasta_id_fkey" FOREIGN KEY ("hasta_id") REFERENCES "nodos_pasillo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
