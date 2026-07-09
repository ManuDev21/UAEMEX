import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Increase body parser limits for large file uploads (PDFs up to 500MB)
  app.useBodyParser('json', { limit: '500mb' });
  app.useBodyParser('urlencoded', { limit: '500mb', extended: true });

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false,
    }),
  );

  app.enableCors({
    origin: config.get<string>('corsOrigin')?.split(',') ?? true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend listo en http://localhost:${port}/graphql`);
}

void bootstrap();
