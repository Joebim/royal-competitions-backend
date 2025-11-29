import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICartItem extends Document {
  competitionId: mongoose.Types.ObjectId;
  quantity: number;
  ticketNumbers?: number[]; // Array of specific ticket numbers selected by user
  unitPrice: number;
  subtotal: number;
  addedAt: Date;
  updatedAt: Date;
}

export interface ICart extends Document {
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
  currency: string;
  updatedAt: Date;
  createdAt: Date;
  getTotals(): {
    items: number;
    subtotal: number;
    totalTickets: number;
  };
}

const cartItemSchema = new Schema<ICartItem>(
  {
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      max: [20, 'Quantity cannot exceed 20 tickets per item'],
    },
    ticketNumbers: {
      type: [Number],
      default: undefined, // Optional - if not provided, tickets will be auto-assigned
      validate: {
        validator: function (value: number[] | undefined) {
          // If ticketNumbers provided, must match quantity
          if (value && Array.isArray(value) && value.length > 0) {
            // Validation will be done in controller to ensure it matches quantity
            // Here we just validate it's an array of numbers
            return value.every((num) => Number.isInteger(num) && num > 0);
          }
          return true; // undefined or empty array is valid
        },
        message: 'All ticket numbers must be positive integers',
      },
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price must be zero or greater'],
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal must be zero or greater'],
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    _id: true,
  }
);

const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    currency: {
      type: String,
      default: 'GBP',
      uppercase: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

cartSchema.methods.getTotals = function () {
  const subtotal = this.items.reduce(
    (total: number, item: ICartItem) => total + item.subtotal,
    0
  );
  const totalTickets = this.items.reduce(
    (total: number, item: ICartItem) => total + item.quantity,
    0
  );

  return {
    items: this.items.length,
    subtotal: Number(subtotal.toFixed(2)),
    totalTickets,
  };
};

const Cart: Model<ICart> = mongoose.model<ICart>('Cart', cartSchema);

export default Cart;


