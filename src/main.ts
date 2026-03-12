import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: true });

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
