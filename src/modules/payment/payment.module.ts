import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { BkashModule } from '../bkash/bkash.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Transaction]),
    BkashModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
