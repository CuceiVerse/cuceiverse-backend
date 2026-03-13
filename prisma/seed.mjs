import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { puntosInteresSeed } from './seed-data/puntos-interes.mjs';
import {
  campusAreasSeed,
  campusAssetsSeed,
  edificiosSeed,
  pathEdgesSeed,
  pathNodesSeed,
} from './seed-data/campus-spatial.mjs';

const tipoPoiSeedMap = {
  FOOD: 'CAFETERIAS',
  MEDICAL: 'MEDICO',
  BATHROOM: 'BANOS',
  CAFETERIA: 'CAFETERIAS',
  GENERAL_SERVICES: 'PAPELERIAS',
  AUDITORIUM: 'AUDITORIOS',
  BANK: 'CAJERO_SANTANDER',
  LIBRARY: 'CONTROL_ESCOLAR',
  INFO: 'CONTROL_ESCOLAR',
  ADMIN: 'CONTROL_ESCOLAR',
};

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

const adminCode = process.env.SEED_ADMIN_CODE;
const adminPass = process.env.SEED_ADMIN_PASSWORD;
const shouldSeedPois = (process.env.SEED_SKIP_POIS ?? 'false').toLowerCase() !== 'true';

const connectionString = process.env.DIRECT_URL ?? requireEnv('DATABASE_URL');
const ssl = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined;

const pool = new Pool({ connectionString, ssl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  if (adminCode && adminPass) {
    const rounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? '10');
    const passwordHash = await bcrypt.hash(
      adminPass,
      Number.isFinite(rounds) ? rounds : 10,
    );

    const admin = await prisma.user.upsert({
      where: { siiauCode: adminCode },
      update: { passwordHash },
      create: {
        siiauCode: adminCode,
        passwordHash,
        displayName: 'Admin',
      },
    });

    const existingProject = await prisma.project.findFirst({
      where: { name: 'Demo Project' },
    });
    const project =
      existingProject ??
      (await prisma.project.create({
        data: { name: 'Demo Project', description: 'Seeded project' },
      }));

    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: admin.id } },
      update: { role: 'PROJECT_MANAGER', isAdmin: true },
      create: {
        projectId: project.id,
        userId: admin.id,
        role: 'PROJECT_MANAGER',
        isAdmin: true,
      },
    });
  } else {
    console.log(
      '[seed] admin skipped: set SEED_ADMIN_CODE and SEED_ADMIN_PASSWORD to seed admin user.',
    );
  }

  if (shouldSeedPois) {
    const nodeByKey = new Map();
    for (const node of pathNodesSeed) {
      const upsertedNode = await prisma.pathNode.upsert({
        where: {
          coordX_coordY: {
            coordX: node.coordX,
            coordY: node.coordY,
          },
        },
        update: {},
        create: {
          coordX: node.coordX,
          coordY: node.coordY,
        },
      });
      nodeByKey.set(node.key, upsertedNode);
    }

    const edificioByCodigo = new Map();
    for (const edificio of edificiosSeed) {
      const upsertedEdificio = await prisma.edificio.upsert({
        where: { codigo: edificio.codigo },
        update: {
          nombre: edificio.nombre,
          tipo: edificio.tipo,
          zona: edificio.zona,
          boundingBox: edificio.boundingBox,
          centroidX: edificio.centroidX,
          centroidY: edificio.centroidY,
        },
        create: {
          codigo: edificio.codigo,
          nombre: edificio.nombre,
          tipo: edificio.tipo,
          zona: edificio.zona,
          boundingBox: edificio.boundingBox,
          centroidX: edificio.centroidX,
          centroidY: edificio.centroidY,
        },
      });
      edificioByCodigo.set(edificio.codigo, upsertedEdificio);
    }

    const areaByCodigo = new Map();
    for (const area of campusAreasSeed) {
      const upsertedArea = await prisma.campusArea.upsert({
        where: { codigo: area.codigo },
        update: {
          nombre: area.nombre,
          tipo: area.tipo,
          boundingBox: area.boundingBox,
          centroidX: area.centroidX,
          centroidY: area.centroidY,
        },
        create: {
          codigo: area.codigo,
          nombre: area.nombre,
          tipo: area.tipo,
          boundingBox: area.boundingBox,
          centroidX: area.centroidX,
          centroidY: area.centroidY,
        },
      });
      areaByCodigo.set(area.codigo, upsertedArea);
    }

    for (const [aKey, bKey] of pathEdgesSeed) {
      const nodeA = nodeByKey.get(aKey);
      const nodeB = nodeByKey.get(bKey);
      if (!nodeA || !nodeB) continue;

      const [nodeAId, nodeBId] =
        nodeA.id < nodeB.id ? [nodeA.id, nodeB.id] : [nodeB.id, nodeA.id];

      const peso = Math.max(
        1,
        Math.round(
          Math.hypot(nodeA.coordX - nodeB.coordX, nodeA.coordY - nodeB.coordY),
        ),
      );

      await prisma.pathEdge.upsert({
        where: { nodeAId_nodeBId: { nodeAId, nodeBId } },
        update: { peso },
        create: { nodeAId, nodeBId, peso },
      });
    }

    const nearestNodeByPoint = (x, y) => {
      let nearest = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const node of nodeByKey.values()) {
        const distance = Math.hypot(node.coordX - x, node.coordY - y);
        if (distance < bestDistance) {
          bestDistance = distance;
          nearest = node;
        }
      }
      return nearest;
    };

    for (const asset of campusAssetsSeed) {
      const nearestNode = nearestNodeByPoint(asset.coordX, asset.coordY);
      const area = asset.areaCodigo ? areaByCodigo.get(asset.areaCodigo) : null;

      await prisma.campusAsset.upsert({
        where: {
          tipo_coordX_coordY: {
            tipo: asset.tipo,
            coordX: asset.coordX,
            coordY: asset.coordY,
          },
        },
        update: {
          nombre: asset.nombre ?? null,
          areaId: area?.id ?? null,
          orientacionDeg: asset.orientacionDeg ?? null,
          nearestPathNodeId: nearestNode?.id ?? null,
        },
        create: {
          tipo: asset.tipo,
          nombre: asset.nombre ?? null,
          coordX: asset.coordX,
          coordY: asset.coordY,
          areaId: area?.id ?? null,
          orientacionDeg: asset.orientacionDeg ?? null,
          nearestPathNodeId: nearestNode?.id ?? null,
        },
      });
    }

    for (const poi of puntosInteresSeed) {
      const mappedTipo = tipoPoiSeedMap[poi.tipo] ?? 'CONTROL_ESCOLAR';
      const edificio = poi.edificioReferencia
        ? edificioByCodigo.get(poi.edificioReferencia)
        : null;
      const nearestNode = nearestNodeByPoint(
        poi.coordenadaXGrid,
        poi.coordenadaYGrid,
      );

      const existing = await prisma.puntoInteres.findFirst({
        where: {
          nombre: poi.nombre,
          tipo: mappedTipo,
          coordenadaXGrid: poi.coordenadaXGrid,
          coordenadaYGrid: poi.coordenadaYGrid,
        },
        select: { id: true },
      });

      const data = {
        nombre: poi.nombre,
        tipo: mappedTipo,
        coordenadaXGrid: poi.coordenadaXGrid,
        coordenadaYGrid: poi.coordenadaYGrid,
        descripcion: poi.descripcion,
        activo: poi.activo,
        edificioReferencia: poi.edificioReferencia,
        edificioId: edificio?.id ?? null,
        nearestPathNodeId: nearestNode?.id ?? null,
        prioridadVisual: poi.prioridadVisual,
      };

      if (existing) {
        await prisma.puntoInteres.update({
          where: { id: existing.id },
          data,
        });
        continue;
      }

      await prisma.puntoInteres.create({ data });
    }

    console.log(`[seed] edificios upserted: ${edificiosSeed.length}`);
    console.log(`[seed] campus_areas upserted: ${campusAreasSeed.length}`);
    console.log(`[seed] campus_assets upserted: ${campusAssetsSeed.length}`);
    console.log(`[seed] path_nodes upserted: ${pathNodesSeed.length}`);
    console.log(`[seed] path_edges upserted: ${pathEdgesSeed.length}`);
    console.log(`[seed] puntos_interes upserted: ${puntosInteresSeed.length}`);
  } else {
    console.log('[seed] puntos_interes skipped via SEED_SKIP_POIS=true');
  }

  console.log('[seed] done');
}

main()
  .catch((err) => {
    console.error('[seed] error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
    await pool.end().catch(() => undefined);
  });