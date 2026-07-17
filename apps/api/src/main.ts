import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import { AppModule } from "./app.module";

// Allow BigInt to be JSON-serialized (audit log ids)
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());

  app.enableCors({
    origin: config.get("FRONTEND_URL", "http://localhost:3000"),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  app.enableVersioning({ type: VersioningType.URI });
  app.setGlobalPrefix("api");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Gissar Water19l API")
    .setDescription("19L Suv Yetkazib Berish ERP tizimi API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = config.get<number>("API_PORT", 3001);
  await app.listen(port);

  console.log(`\n🚀 API:     http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger: http://localhost:${port}/api/docs\n`);
}

bootstrap();
