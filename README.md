
---

```md
# README.md

# CUCEIverse Backend

Backend de CUCEIverse: **NestJS + Prisma v7 (adapter-pg) + PostgreSQL (Supabase)**.

Deploy (develop):  
- `https://cuceiverse-backend-develop.onrender.com`

---

## Stack

- **NestJS**
- **Prisma v7** con `@prisma/adapter-pg` + `pg.Pool`
- **PostgreSQL** (Supabase en remoto)
- **Auth**: JWT + bcrypt
- **CI**: lint/build + e2e con Postgres service

---

## Requirements

- Node **20.x** (recomendado: `fnm use 20` o equivalente)
- npm
- Docker (opcional, para Postgres local)

---

## Quick Start (Local)

### 1) Install
```bash
npm ci