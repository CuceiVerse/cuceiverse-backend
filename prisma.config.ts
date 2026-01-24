import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const pooledUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;

const url = directUrl ?? pooledUrl;

if (!url) {
  throw new Error('Missing DATABASE_URL (and optionally DIRECT_URL).');
}

const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url,
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
});
