CREATE TYPE "PuntoInteresTipo" AS ENUM (
  'FOOD',
  'MEDICAL',
  'BATHROOM',
  'CAFETERIA',
  'GENERAL_SERVICES',
  'AUDITORIUM',
  'BANK',
  'LIBRARY',
  'INFO',
  'ADMIN'
);

CREATE TABLE "puntos_interes" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "tipo" "PuntoInteresTipo" NOT NULL,
  "coordenada_x_grid" INTEGER NOT NULL,
  "coordenada_y_grid" INTEGER NOT NULL,
  "descripcion" TEXT,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "edificio_referencia" TEXT,
  "prioridad_visual" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "puntos_interes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "puntos_interes_tipo_activo_idx" ON "puntos_interes"("tipo", "activo");
CREATE INDEX "puntos_interes_edificio_referencia_idx" ON "puntos_interes"("edificio_referencia");
CREATE INDEX "puntos_interes_prioridad_visual_idx" ON "puntos_interes"("prioridad_visual");