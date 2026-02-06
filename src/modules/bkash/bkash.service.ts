import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  BkashTokenResponse,
  BkashCreatePaymentResponse,
  BkashExecutePaymentResponse,
  BkashQueryPaymentResponse,
  BkashRefundResponse,
} from './interfaces/bkash.interface';

@Injectable()
export class BkashService {
  private readonly logger = new Logger(BkashService.name);
  private idToken: string | null = null;
  private tokenExpiry: number = 0;

  private readonly baseUrl: string;
  private readonly appKey: string;
  private readonly appSecret: string;
  private readonly username: string;
  private readonly password: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('bkash.baseUrl')!;
    this.appKey = this.configService.get<string>('bkash.appKey')!;
    this.appSecret = this.configService.get<string>('bkash.appSecret')!;
    this.username = this.configService.get<string>('bkash.username')!;
    this.password = this.configService.get<string>('bkash.password')!;
  }

  private async getToken(): Promise<string> {
    if (this.idToken && Date.now() < this.tokenExpiry) {
      return this.idToken;
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<BkashTokenResponse>(
          `${this.baseUrl}/tokenized/checkout/token/grant`,
          {
            app_key: this.appKey,
            app_secret: this.appSecret,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              username: this.username,
              password: this.password,
            },
          },
        ),
      );

      if (data.statusCode !== '0000') {
        throw new Error(data.statusMessage);
      }

      this.idToken = data.id_token;
      this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
      return this.idToken;
    } catch (error: any) {
      this.logger.error('Token grant failed', error.message);
      throw new HttpException(
        'Failed to authenticate with bKash',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async getHeaders() {
    const token = await this.getToken();
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: token,
      'X-APP-Key': this.appKey,
    };
  }

  async createPayment(
    amount: string,
    invoiceNumber: string,
    callbackUrl: string,
  ): Promise<BkashCreatePaymentResponse> {
    try {
      const headers = await this.getHeaders();
      const { data } = await firstValueFrom(
        this.httpService.post<BkashCreatePaymentResponse>(
          `${this.baseUrl}/tokenized/checkout/create`,
          {
            mode: '0011',
            payerReference: ' ',
            callbackURL: callbackUrl,
            amount,
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: invoiceNumber,
          },
          { headers },
        ),
      );

      if (data.statusCode !== '0000') {
        throw new Error(data.statusMessage || 'Payment creation failed');
      }

      return data;
    } catch (error: any) {
      this.logger.error('Create payment failed', error.message);
      throw new HttpException(
        error.message || 'Failed to create bKash payment',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async executePayment(paymentId: string): Promise<BkashExecutePaymentResponse> {
    try {
      const headers = await this.getHeaders();
      const { data } = await firstValueFrom(
        this.httpService.post<BkashExecutePaymentResponse>(
          `${this.baseUrl}/tokenized/checkout/execute`,
          { paymentID: paymentId },
          { headers },
        ),
      );

      if (data.statusCode !== '0000') {
        throw new Error(data.statusMessage || 'Payment execution failed');
      }

      return data;
    } catch (error: any) {
      this.logger.error('Execute payment failed', error.message);
      throw new HttpException(
        error.message || 'Failed to execute bKash payment',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async queryPayment(paymentId: string): Promise<BkashQueryPaymentResponse> {
    try {
      const headers = await this.getHeaders();
      const { data } = await firstValueFrom(
        this.httpService.post<BkashQueryPaymentResponse>(
          `${this.baseUrl}/tokenized/checkout/payment/status`,
          { paymentID: paymentId },
          { headers },
        ),
      );

      return data;
    } catch (error: any) {
      this.logger.error('Query payment failed', error.message);
      throw new HttpException(
        'Failed to query bKash payment',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async refundPayment(
    paymentId: string,
    trxId: string,
    amount: string,
    reason: string,
  ): Promise<BkashRefundResponse> {
    try {
      const headers = await this.getHeaders();
      const { data } = await firstValueFrom(
        this.httpService.post<BkashRefundResponse>(
          `${this.baseUrl}/tokenized/checkout/payment/refund`,
          {
            paymentID: paymentId,
            trxID: trxId,
            amount,
            reason,
            sku: 'payment',
          },
          { headers },
        ),
      );

      if (data.statusCode !== '0000') {
        throw new Error(data.statusMessage || 'Refund failed');
      }

      return data;
    } catch (error: any) {
      this.logger.error('Refund failed', error.message);
      throw new HttpException(
        error.message || 'Failed to refund bKash payment',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
