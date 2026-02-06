import { IsNotEmpty, IsString, IsNumberString } from 'class-validator';

export class RefundPaymentDto {
  @IsNotEmpty()
  @IsString()
  paymentId: string;

  @IsNotEmpty()
  @IsNumberString()
  amount: string;

  @IsNotEmpty()
  @IsString()
  reason: string;
}
