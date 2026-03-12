CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'PuntoInteresTipo'
  ) THEN
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
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS puntos_interes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo "PuntoInteresTipo" NOT NULL,
  coordenada_x_grid INTEGER NOT NULL,
  coordenada_y_grid INTEGER NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  edificio_referencia VARCHAR(12),
  prioridad_visual INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_puntos_interes_tipo_activo
  ON puntos_interes (tipo, activo);

CREATE INDEX IF NOT EXISTS idx_puntos_interes_edificio
  ON puntos_interes (edificio_referencia);

CREATE INDEX IF NOT EXISTS idx_puntos_interes_prioridad_visual
  ON puntos_interes (prioridad_visual);