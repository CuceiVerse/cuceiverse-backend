process.env.SIIAU_MODE = process.env.SIIAU_MODE ?? 'fixture';

// Si CI ya define DATABASE_URL, lo respetamos.
// Si NO existe (o tu local está mal), cae a localhost.
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/cuceiverse_test?schema=public';

// Si usas DIRECT_URL para migraciones/adapter, igual:
process.env.DIRECT_URL = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
