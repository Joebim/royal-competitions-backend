import mongoose, { Schema, Document, Model } from 'mongoose';

export enum TicketStatus {
  RESERVED = 'reserved',
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  WINNER = 'winner',
  REFUNDED = 'refunded',
  INVALID = 'invalid',
}

export interface ITicket extends Document {
  competitionId: mongoose.Types.ObjectId;
  ticketNumber: number;
  userId?: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  status: TicketStatus;
  isValid: boolean; // Whether ticket is valid for draws (false if answer was incorrect)
  reservedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
    },
    ticketNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    status: {
      type: String,
      enum: Object.values(TicketStatus),
      required: true,
      default: TicketStatus.RESERVED,
    },
    isValid: {
      type: Boolean,
      default: true, // Default to true - tickets are valid unless answer is incorrect
      index: true, // Index for efficient filtering during draws
    },
    reservedUntil: {
      type: Date,
      index: { expireAfterSeconds: 0 }, // TTL index for auto-cleanup
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
ticketSchema.index({ competitionId: 1, ticketNumber: 1 }, { unique: true });
ticketSchema.index({ competitionId: 1, status: 1 });
ticketSchema.index({ competitionId: 1, status: 1, isValid: 1 }); // For efficient draw queries
ticketSchema.index({ userId: 1, competitionId: 1 });
ticketSchema.index({ orderId: 1 });
ticketSchema.index({ status: 1, reservedUntil: 1 });

const Ticket: Model<ITicket> = mongoose.model<ITicket>('Ticket', ticketSchema);

export default Ticket;

