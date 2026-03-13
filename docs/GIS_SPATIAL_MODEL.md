# GIS Spatial Model (CUCEIverse)

## Objetivo

Evolucionar de layout conceptual a representacion fiel del campus CUCEI sobre grid cartesiano local, conservando render pixel art isometrico.

## Sistema de Coordenadas

- Origen: `(0, 0)` en esquina superior izquierda del perimetro de campus.
- Unidad: `1 celda = 1 m2` (aprox. para calibracion operativa).
- Render: el frontend proyecta este grid a isometrico via `TILE_SIZE`.

## Capas de Datos

1. `Edificio`
- Poligonos `boundingBox` con contorno por modulo (A..Z2, CID, Coliseo, Pista).
- Incluye geometrias no rectangulares:
- `F` multi-ala (poligono concavo).
- `Y` con forma tipo U (poligono concavo simplificado).

2. `PathNode` + `PathEdge`
- Grafo peatonal para rutas y snap.
- Se densifico para aproximar trazos de pasillos de referencia.

3. `CampusArea`
- Poligonos para perimetro, jardines, explanadas, pasillos, deportiva y estacionamientos.

4. `CampusAsset`
- Microubicacion de `ARBOL`, `ARBUSTO`, `BANCA`, `LUMINARIA`, `BASURERO`.
- Cada asset puede enlazarse a area y nodo de pasillo mas cercano.

## Endpoints Admin

- `GET /mapa/edificios`
- `GET /mapa/grafo`
- `GET /mapa/areas`
- `GET /mapa/mobiliario`
- `GET /mapa/nodo-mas-cercano`
- `POST /mapa/sync`

## Flujo de Calibracion Fina

1. Tomar perimetro y accesos de referencia satelital.
2. Ajustar edificios con control points visibles (esquinas, puertas, ejes de vialidad).
3. Ajustar grafo para que cada entrada de modulo tenga nodo cercano.
4. Cargar mobiliario por lotes por zona (norte, central, sur, deportiva).
5. Validar rutas entre puertas y POIs con A*.

## Nota

Este modelo deja lista la estructura GIS y una base de alta fidelidad. El ajuste centimetrico final depende de una sesion de calibracion sobre imagen georreferenciada en editor.
