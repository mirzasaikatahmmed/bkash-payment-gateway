import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { join } from 'path';
import * as hbs from 'hbs';
import { readFileSync } from 'fs';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  // View engine
  const viewsDir = join(__dirname, 'views');
  app.setBaseViewsDir(viewsDir);
  app.setViewEngine('hbs');

  // Register layout partials
  const layoutsDir = join(viewsDir, 'layouts');
  const handlebarsEngine = hbs.handlebars;
  handlebarsEngine.registerPartial(
    'header',
    readFileSync(join(layoutsDir, 'header.hbs'), 'utf-8'),
  );
  handlebarsEngine.registerPartial(
    'footer',
    readFileSync(join(layoutsDir, 'footer.hbs'), 'utf-8'),
  );

  // Handlebars helpers
  const handlebars = hbs.handlebars;
  handlebars.registerHelper('ifEquals', function (this: any, a: any, b: any, opts: any) {
    return a === b ? opts.fn(this) : opts.inverse(this);
  });
  handlebars.registerHelper('lowercase', (str: string) => str?.toLowerCase());
  handlebars.registerHelper('gt', (a: number, b: number) => a > b);
  handlebars.registerHelper('lt', (a: number, b: number) => a < b);
  handlebars.registerHelper('add', (a: number, b: number) => a + b);
  handlebars.registerHelper('subtract', (a: number, b: number) => a - b);

  // Global pipes and filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS
  app.enableCors();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}`);
}
bootstrap();
