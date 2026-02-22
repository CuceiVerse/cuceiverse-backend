# docs/ENV.md

## Overview

Este documento define el **contrato de variables de entorno** para `cuceiverse-backend` (NestJS + Prisma v7 + PostgreSQL).

> Regla práctica:
> - **Local/CI:** puedes usar Postgres local (Docker) y `prisma migrate dev`.
> - **Supabase/Render:** usa **`prisma migrate deploy`** (NO uses `migrate dev` ni `migrate reset` contra Supabase).

---

## Required (obligatorias)

### DATABASE_URL
Cadena de conexión a PostgreSQL.

- **Local (Docker):**
  - `postgresql://postgres:postgres@localhost:5432/cuceiverse_dev`
- **Supabase/Render:** la URL que te da Supabase (pooler/connection string).

### JWT_SECRET
Secreto para firmar/verificar JWT. Si no existe, el backend falla al iniciar (Auth).

---

## Optional (opcionales)

### DATABASE_SSL
Bandera de SSL para DB (string).

- Usado principalmente como señal de entorno (ej. CI la setea).
- Recomendación:
  - Local: `DATABASE_SSL="false"`
  - Prod: `DATABASE_SSL="true"` (aunque el código actual usa `NODE_ENV === 'production'` para habilitar SSL con `rejectUnauthorized: false`)

### JWT_EXPIRES_IN
Expiración de tokens JWT.

- Default recomendado: `7d`
- Ejemplos: `1h`, `12h`, `7d`

### BCRYPT_SALT_ROUNDS
Rounds para bcrypt.

- Default recomendado: `10`
- Ejemplo: `12` (más costoso)

---

## Seed (safe)

El seed **solo corre** si se definen estas variables.

### SEED_ADMIN_CODE
SIIAU code del usuario admin seed (ej. `admin01`).

### SEED_ADMIN_PASSWORD
Password del usuario admin seed (ej. `123456`).

---

## Example (.env.example)

```env
# ----------------------------
# Database
# ----------------------------
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cuceiverse_dev"
DATABASE_SSL="false"

# ----------------------------
# Auth / JWT
# ----------------------------
JWT_SECRET="change-me"
JWT_EXPIRES_IN="7d"

# ----------------------------
# Bcrypt
# ----------------------------
BCRYPT_SALT_ROUNDS="10"

# ----------------------------
# Seeds (safe: only runs if set)
# ----------------------------
SEED_ADMIN_CODE=""
SEED_ADMIN_PASSWORD=""