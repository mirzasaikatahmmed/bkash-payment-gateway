import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { appConfig, databaseConfig, bkashConfig } from './common/config/app.config';
import { DatabaseModule } from './database/database.module';
import { PaymentModule } from './modules/payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, bkashConfig],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'public'),
      serveRoot: '/',
      serveStaticOptions: { index: false },
    }),
    DatabaseModule,
    PaymentModule,
  ],
})
export class AppModule {}
