import bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

const adminCode = process.env.SEED_ADMIN_CODE;
const adminPass = process.env.SEED_ADMIN_PASSWORD;

if (!adminCode || !adminPass) {
  console.log('[seed] SKIP: set SEED_ADMIN_CODE and SEED_ADMIN_PASSWORD to seed admin user.');
  await prisma.$disconnect();
  process.exit(0);
}

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

const project = await prisma.project.upsert({
  where: { name: 'Demo Project' },
  update: {},
  create: { name: 'Demo Project', description: 'Seeded project' },
});

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

await prisma.$disconnect();
console.log('[seed] done');
