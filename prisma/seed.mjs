import bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

const adminCode = process.env.SEED_ADMIN_CODE;
const adminPass = process.env.SEED_ADMIN_PASSWORD;

if (!adminCode || !adminPass) {
  console.log('[seed] SKIP: set SEED_ADMIN_CODE and SEED_ADMIN_PASSWORD to seed admin user.');
  process.exit(0);
}

const connectionString = requireEnv('DATABASE_URL');
const ssl = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined;

const pool = new Pool({ connectionString, ssl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? '10');
  const passwordHash = await bcrypt.hash(adminPass, Number.isFinite(rounds) ? rounds : 10);

  const admin = await prisma.user.upsert({
    where: { siiauCode: adminCode },
    update: { passwordHash },
    create: {
      siiauCode: adminCode,
      passwordHash,
      displayName: 'Admin',
    },
  });

  // Project.name no es unique => usamos findFirst + create para idempotencia “suave”
  const existingProject = await prisma.project.findFirst({ where: { name: 'Demo Project' } });
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