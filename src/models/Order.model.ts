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

export interface IOrderItem {
  competitionId: mongoose.Types.ObjectId;
  competitionTitle: string;
  quantity: number;
  ticketPrice: number;
  total: number;
  answer: string;
  ticketNumbers: string[];
}

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  orderNumber: string;
  items: IOrderItem[];
  subtotal: number;
  total: number;
  fees?: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paymentIntentId?: string;
  paymentMethod?: string;
  billingDetails?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  getTotalTickets(): number;
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

const orderItemSchema = new Schema<IOrderItem>(
  {
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
    },
    competitionTitle: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    ticketPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    answer: {
      type: String,
      required: true,
    },
    ticketNumbers: {
      type: [String],
      default: [],
    },
  },
  { _id: true }
);

const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    fees: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: 'GBP',
      uppercase: true,
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
    paymentIntentId: String,
    paymentMethod: String,
    billingDetails: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
    },
    billingAddress: addressSchema,
    shippingAddress: addressSchema,
    notes: String,
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });

orderSchema.methods.getTotalTickets = function (): number {
  return this.items.reduce(
    (total: number, item: IOrderItem) => total + item.quantity,
    0
  );
};

orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.orderNumber = `RC${timestamp}${random}`;
  }
  next();
});

const Order: Model<IOrder> = mongoose.model<IOrder>('Order', orderSchema);

export default Order;




