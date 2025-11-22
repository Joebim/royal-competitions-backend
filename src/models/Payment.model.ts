import mongoose, { Schema, Document, Model } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export interface IPayment extends Document {
  orderId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentIntentId: string;
  paymentMethod?: string;
  refundId?: string;
  refundAmount?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      set: (v: number) => Math.round(v * 100) / 100, // Round to 2 decimal places
    },
    currency: {
      type: String,
      default: 'gbp',
      uppercase: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    paymentIntentId: {
      type: String,
      required: true,
      unique: true, // unique: true automatically creates an index
    },
    paymentMethod: String,
    refundId: String,
    refundAmount: {
      type: Number,
      set: (v: number) => v ? Math.round(v * 100) / 100 : v, // Round to 2 decimal places
    },
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

// Indexes
// paymentIntentId already has unique: true and index: true above
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });

const Payment: Model<IPayment> = mongoose.model<IPayment>('Payment', paymentSchema);

export default Payment;




