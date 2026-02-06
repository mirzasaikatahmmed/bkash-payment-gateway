import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PaymentStatus } from '../../../common/enums';
import { Transaction } from '../../transaction/entities/transaction.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerName: string;

  @Column()
  customerPhone: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.INITIATED,
  })
  status: PaymentStatus;

  @Column({ nullable: true })
  bkashPaymentId: string;

  @Column({ nullable: true })
  bkashTrxId: string;

  @Column({ nullable: true })
  payerReference: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  refundedAmount: number;

  @OneToMany(() => Transaction, (transaction) => transaction.payment, {
    cascade: true,
  })
  transactions: Transaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
