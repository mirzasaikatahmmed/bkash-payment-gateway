import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Payment } from '../../payment/entities/payment.entity';

export enum TransactionType {
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  bkashTrxId: string;

  @Column({ nullable: true })
  bkashRefundTrxId: string;

  @Column({ nullable: true })
  status: string;

  @Column('jsonb', { nullable: true })
  rawResponse: Record<string, any>;

  @ManyToOne(() => Payment, (payment) => payment.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;

  @Column()
  paymentId: string;

  @CreateDateColumn()
  createdAt: Date;
}
