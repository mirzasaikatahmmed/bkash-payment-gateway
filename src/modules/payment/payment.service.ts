import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Payment } from './entities/payment.entity';
import { Transaction, TransactionType } from '../transaction/entities/transaction.entity';
import { BkashService } from '../bkash/bkash.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PaymentStatus } from '../../common/enums';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly appUrl: string;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly bkashService: BkashService,
    private readonly configService: ConfigService,
  ) {
    this.appUrl = this.configService.get<string>('app.url')!;
  }

  async initiatePayment(dto: CreatePaymentDto) {
    const invoiceNumber = uuidv4().slice(0, 8).toUpperCase();

    const payment = this.paymentRepo.create({
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      amount: parseFloat(dto.amount),
      status: PaymentStatus.INITIATED,
    });

    const saved = await this.paymentRepo.save(payment);

    const callbackUrl = `${this.appUrl}/api/payments/callback/${saved.id}`;
    const bkashResponse = await this.bkashService.createPayment(
      dto.amount,
      invoiceNumber,
      callbackUrl,
    );

    saved.bkashPaymentId = bkashResponse.paymentID;
    await this.paymentRepo.save(saved);

    await this.transactionRepo.save(
      this.transactionRepo.create({
        type: TransactionType.PAYMENT,
        amount: parseFloat(dto.amount),
        status: 'INITIATED',
        paymentId: saved.id,
        rawResponse: bkashResponse as any,
      }),
    );

    return { bkashURL: bkashResponse.bkashURL, paymentId: saved.id };
  }

  async handleCallback(paymentId: string, status: string, bkashPaymentId: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (status !== 'success') {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepo.save(payment);
      return { success: false, payment };
    }

    const executeResponse = await this.bkashService.executePayment(bkashPaymentId);

    payment.status = PaymentStatus.COMPLETED;
    payment.bkashTrxId = executeResponse.trxID;
    payment.payerReference = executeResponse.payerReference;
    await this.paymentRepo.save(payment);

    await this.transactionRepo.save(
      this.transactionRepo.create({
        type: TransactionType.PAYMENT,
        amount: parseFloat(executeResponse.amount),
        bkashTrxId: executeResponse.trxID,
        status: executeResponse.transactionStatus,
        paymentId: payment.id,
        rawResponse: executeResponse as any,
      }),
    );

    return { success: true, payment };
  }

  async refundPayment(dto: RefundPaymentDto) {
    const payment = await this.paymentRepo.findOne({
      where: { id: dto.paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED && payment.status !== PaymentStatus.PARTIALLY_REFUNDED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    const refundableAmount = payment.amount - payment.refundedAmount;
    if (parseFloat(dto.amount) > refundableAmount) {
      throw new BadRequestException(
        `Refund amount exceeds refundable balance of ${refundableAmount} BDT`,
      );
    }

    const refundResponse = await this.bkashService.refundPayment(
      payment.bkashPaymentId!,
      payment.bkashTrxId!,
      dto.amount,
      dto.reason,
    );

    payment.refundedAmount = Number(payment.refundedAmount) + parseFloat(dto.amount);
    payment.status =
      payment.refundedAmount >= payment.amount
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

    await this.paymentRepo.save(payment);

    await this.transactionRepo.save(
      this.transactionRepo.create({
        type: TransactionType.REFUND,
        amount: parseFloat(dto.amount),
        bkashTrxId: refundResponse.originalTrxID,
        bkashRefundTrxId: refundResponse.refundTrxID,
        status: refundResponse.transactionStatus,
        paymentId: payment.id,
        rawResponse: refundResponse as any,
      }),
    );

    return {
      message: 'Refund processed successfully',
      refundTrxId: refundResponse.refundTrxID,
      refundedAmount: dto.amount,
      remainingRefundable: payment.amount - payment.refundedAmount,
    };
  }

  async getPaymentById(id: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id },
      relations: ['transactions'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async getAllPayments(page = 1, limit = 20) {
    const [payments, total] = await this.paymentRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['transactions'],
    });

    return {
      payments: JSON.parse(JSON.stringify(payments)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTransactionHistory(page = 1, limit = 20) {
    const [transactions, total] = await this.transactionRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['payment'],
    });

    return {
      transactions: JSON.parse(JSON.stringify(transactions)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
