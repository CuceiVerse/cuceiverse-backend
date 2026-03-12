# Modulo De Mapa Interactivo

## Resumen

Este modulo expone los puntos de interes del campus para el frontend Pixi de CUCEIverse.

Stack involucrado:

- Prisma model: `PuntoInteres`
- REST endpoint: `GET /puntos-interes`
- Frontend consumer: `cuceiverse-web/src/features/campus-map`

## Modelo

Campos principales:

- `id`
- `nombre`
- `tipo`
- `coordenada_x_grid`
- `coordenada_y_grid`
- `descripcion`
- `activo`
- `edificio_referencia`
- `prioridad_visual`

## Endpoint

Ruta:

- `GET /puntos-interes`

Query params soportados:

- `tipo`: `food`, `medical`, `bathroom`, `cafeteria`, `general_services`, `auditorium`, `bank`, `library`, `info`, `admin`
- `edificio`: codigo corto de edificio, por ejemplo `F` o `A`
- `activo`: `true` o `false`
- `limit`: entero de 1 a 200

Ejemplos:

- `GET /puntos-interes`
- `GET /puntos-interes?tipo=food`
- `GET /puntos-interes?tipo=cafeteria&edificio=L`
- `GET /puntos-interes?activo=true&limit=20`

## Seed

El comando `npm run db:seed` ahora inserta POIs iniciales del campus aunque no se definan credenciales admin.

Variables relacionadas:

- `SEED_ADMIN_CODE`
- `SEED_ADMIN_PASSWORD`
- `SEED_SKIP_POIS`

## Flujo recomendado local

1. Ejecutar `npm run db:migrate:dev`
2. Ejecutar `npm run db:seed`
3. Levantar backend con `npm run start:dev`
4. Levantar frontend con `npm run dev`