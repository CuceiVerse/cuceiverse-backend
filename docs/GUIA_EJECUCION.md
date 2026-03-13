# Guía de ejecución de CUCEIverse (con troubleshooting real)

Esta guía resume cómo correr el proyecto localmente y cómo resolver los problemas que sí aparecieron durante la puesta en marcha.

## 1) Requisitos

- **Node.js**: `>=20 <21` (recomendado Node 20 LTS).
- **npm**: versión compatible con Node 20.
- Acceso a internet (para instalar paquetes y conectar a la BD remota en `.env`).

> ⚠️ Se detectó Node `24.x` en local y aunque algunas tareas funcionaron, puede causar comportamiento inestable.

---

## 2) Estructura usada en esta guía

- Backend: `cuceiverse-backend`
- Web: `cuceiverse-web`

---

## 3) Flujo recomendado de arranque

### Paso A — Backend

```bash
cd cuceiverse-backend
npm install
npx prisma generate
npm run db:migrate:deploy
npm run dev
```

Notas importantes:
- Usa **`npm run dev`** (no `npm start`) para este repo cuando acabas de actualizar Prisma.
- `dev` ejecuta:
  - `prisma generate`
  - copia de artefactos generados
  - `nest start --watch`

Esto evita inconsistencias entre `src/generated` y `dist/generated`.

### Paso B — Web

En otra terminal:

```bash
cd cuceiverse-web
npm install
npm run dev
```

Vite levantará normalmente en:
- `http://localhost:5173`

El frontend usa por defecto:
- `VITE_API_BASE_URL ?? http://localhost:3000`

---

## 4) Verificación rápida

### Backend health

```bash
curl -sS http://localhost:3000/health
```

Respuesta esperada (ejemplo):

```json
{"status":"ok","service":"cuceiverse-backend","db":"connected"}
```

### Login admin de prueba (entorno no productivo)

```bash
curl -sS -i -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"codigo":"admin","nip":"admin123"}'
```

Respuesta esperada:
- `HTTP/1.1 200 OK`
- `accessToken` en el body.

---

## 5) Problemas que tuvimos y solución

### 5.1 `npm start` falla con `ENOENT package.json`

**Síntoma**
- `npm` busca `package.json` en la raíz del workspace (`/CUCEIverse`) y falla.

**Causa**
- Comando ejecutado fuera de la carpeta del proyecto.

**Solución**
- Entrar al repo correcto antes de correr comandos:
  - `cd cuceiverse-backend`
  - o usar `npm --prefix /ruta/al/repo <comando>`

---

### 5.2 Error en backend: `Cannot read properties of undefined (reading 'BANOS')`

**Síntoma**
- Al iniciar, falla al cargar `PuntoInteresTipo.BANOS`.

**Causa**
- Artefactos generados en `dist` desactualizados respecto a `src/generated`.

**Solución**
- Ejecutar `npm run dev` en backend para regenerar y copiar Prisma correctamente.

---

### 5.3 Login admin devuelve `500 Internal Server Error`

**Síntoma**
- `POST /auth/login` regresaba 500.

**Causa real detectada**
- Esquema de BD remota desactualizado:
  - faltaban migraciones
  - error Prisma: columna `siiau_code` no existe.

**Solución**

```bash
cd cuceiverse-backend
npm run db:migrate:deploy
```

Después de esto el login admin respondió `200 OK`.

---

### 5.4 `EADDRINUSE: address already in use :::3000`

**Síntoma**
- No arranca backend por puerto ocupado.

**Solución**
- Matar proceso en `3000` o arrancar en otro puerto.

```bash
lsof -ti tcp:3000 | xargs -I {} kill -9 {}
```

O iniciar temporalmente en otro puerto:

```bash
PORT=3001 npm run dev
```

---

### 5.5 Warnings de engine (`EBADENGINE`)

**Síntoma**
- `npm WARN EBADENGINE`, porque proyecto pide `>=20 <21`.

**Solución recomendada**
- Cambiar a Node 20 LTS (por ejemplo con `nvm use 20`).

---

## 6) Comandos útiles (resumen)

### Backend

```bash
cd cuceiverse-backend
npm install
npx prisma generate
npm run db:migrate:deploy
npm run dev
```

### Web

```bash
cd cuceiverse-web
npm install
npm run dev
```

---

## 7) Estado esperado al final

- Backend arriba en `http://localhost:3000`
- Web arriba en `http://localhost:5173`
- `GET /health` responde `ok`
- Login admin de prueba funciona en entorno local/no productivo
