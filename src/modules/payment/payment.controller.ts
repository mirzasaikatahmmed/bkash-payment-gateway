import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  Render,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';

@Controller()
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Get('/')
  @Render('payment-form')
  paymentForm() {
    return { title: 'bKash Payment Gateway' };
  }

  @Get('/success')
  @Render('success')
  successPage(@Query('paymentId') paymentId: string) {
    return { title: 'Payment Successful', paymentId };
  }

  @Get('/failure')
  @Render('failure')
  failurePage(@Query('message') message: string) {
    return { title: 'Payment Failed', message: message || 'Payment was not completed' };
  }

  @Get('/transactions')
  @Render('transactions')
  async transactionsPage(
    @Query('page') page: string,
  ) {
    const result = await this.paymentService.getAllPayments(
      parseInt(page || '1', 10),
    );
    return { title: 'Transaction History', ...result };
  }

  @Post('/api/payments/initiate')
  async initiatePayment(@Body() dto: CreatePaymentDto, @Res() res: Response) {
    const result = await this.paymentService.initiatePayment(dto);
    return res.redirect(result.bkashURL);
  }

  @Get('/api/payments/callback/:id')
  async paymentCallback(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status: string,
    @Query('paymentID') bkashPaymentId: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.paymentService.handleCallback(
        id,
        status,
        bkashPaymentId,
      );

      if (result.success) {
        return res.redirect(`/success?paymentId=${result.payment.id}`);
      }

      return res.redirect('/failure?message=Payment was cancelled or failed');
    } catch (error: any) {
      this.logger.error('Callback error', error.message);
      return res.redirect(`/failure?message=${encodeURIComponent(error.message)}`);
    }
  }

  @Post('/api/payments/refund')
  async refundPayment(@Body() dto: RefundPaymentDto) {
    return this.paymentService.refundPayment(dto);
  }

  @Get('/api/payments')
  async getAllPayments(
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.paymentService.getAllPayments(
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
    );
  }

  @Get('/api/payments/:id')
  async getPayment(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentService.getPaymentById(id);
  }

  @Get('/api/transactions')
  async getTransactions(
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.paymentService.getTransactionHistory(
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
    );
  }
}
