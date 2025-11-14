import mongoose, { Schema, Document, Model } from 'mongoose';

export enum EventType {
  TICKET_RESERVED = 'ticket_reserved',
  TICKET_ISSUED = 'ticket_issued',
  TICKET_CANCELLED = 'ticket_cancelled',
  ORDER_CREATED = 'order_created',
  ORDER_PAID = 'order_paid',
  ORDER_FAILED = 'order_failed',
  ORDER_REFUNDED = 'order_refunded',
  DRAW_CREATED = 'draw_created',
  WINNER_SELECTED = 'winner_selected',
  WINNER_NOTIFIED = 'winner_notified',
  WINNER_CLAIMED = 'winner_claimed',
  COMPETITION_CLOSED = 'competition_closed',
  COMPETITION_DRAWN = 'competition_drawn',
}

export interface IEvent extends Document {
  type: EventType;
  entity: string; // 'ticket', 'order', 'draw', 'winner', etc.
  entityId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  competitionId?: mongoose.Types.ObjectId;
  payload: any; // Flexible payload for event-specific data
  createdAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    type: {
      type: String,
      enum: Object.values(EventType),
      required: true,
    },
    entity: {
      type: String,
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable - no updatedAt
  }
);

// Compound indexes
eventSchema.index({ type: 1, createdAt: -1 });
eventSchema.index({ entity: 1, entityId: 1 });
eventSchema.index({ userId: 1, createdAt: -1 });
eventSchema.index({ competitionId: 1, createdAt: -1 });
eventSchema.index({ createdAt: -1 }); // For time-based queries

const Event: Model<IEvent> = mongoose.model<IEvent>('Event', eventSchema);

export default Event;

