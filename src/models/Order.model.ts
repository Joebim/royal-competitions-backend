import mongoose, { Schema, Document, Model } from 'mongoose';

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum OrderPaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export interface IOrder extends Document {
  userId?: mongoose.Types.ObjectId; // Optional for guest checkout
  competitionId: mongoose.Types.ObjectId;
  orderNumber: string; // Unique order number
  amount: number; // Total amount in decimal (e.g., 3.99)
  currency: string;
  quantity: number; // Number of tickets
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  stripePaymentIntent?: string; // Deprecated - kept for backward compatibility
  paypalOrderId?: string;
  ticketsReserved: number[]; // Array of reserved ticket numbers
  paymentReference?: string;
  billingDetails?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
  marketingOptIn?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema(
  {
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'GB' },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      set: (v: number) => Math.round(v * 100) / 100, // Round to 2 decimal places
    },
    currency: {
      type: String,
      default: 'GBP',
      uppercase: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(OrderPaymentStatus),
      default: OrderPaymentStatus.PENDING,
    },
    stripePaymentIntent: {
      type: String,
    },
    paypalOrderId: {
      type: String,
    },
    ticketsReserved: {
      type: [Number],
      default: [],
    },
    paymentReference: String,
    billingDetails: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
    },
    shippingAddress: addressSchema,
    marketingOptIn: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ competitionId: 1 });
orderSchema.index({ status: 1, paymentStatus: 1 });
orderSchema.index({ stripePaymentIntent: 1 });
orderSchema.index({ paypalOrderId: 1 });

const Order: Model<IOrder> = mongoose.model<IOrder>('Order', orderSchema);

export default Order;
