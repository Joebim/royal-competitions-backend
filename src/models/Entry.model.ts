import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEntry extends Document {
  userId: mongoose.Types.ObjectId;
  competitionId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  ticketNumber: string;
  answer: string;
  isCorrect: boolean;
  isWinner: boolean;
  createdAt: Date;
}

const entrySchema = new Schema<IEntry>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    answer: {
      type: String,
      required: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    isWinner: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
entrySchema.index({ userId: 1, competitionId: 1 });
entrySchema.index({ competitionId: 1, isCorrect: 1 });
// ticketNumber already has unique: true and index: true above

const Entry: Model<IEntry> = mongoose.model<IEntry>('Entry', entrySchema);

export default Entry;




