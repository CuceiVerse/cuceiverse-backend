import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { puntosInteresSeed } from './seed-data/puntos-interes.mjs';

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
    for (const poi of puntosInteresSeed) {
      const existing = await prisma.puntoInteres.findFirst({
        where: {
          nombre: poi.nombre,
          tipo: poi.tipo,
          coordenadaXGrid: poi.coordenadaXGrid,
          coordenadaYGrid: poi.coordenadaYGrid,
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.puntoInteres.update({
          where: { id: existing.id },
          data: poi,
        });
        continue;
      }

      await prisma.puntoInteres.create({ data: poi });
    }

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