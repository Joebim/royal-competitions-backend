import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWinner extends Document {
  competitionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  entryId: mongoose.Types.ObjectId;
  ticketNumber: string;
  announcedAt: Date;
  notified: boolean;
  claimed: boolean;
  claimedAt?: Date;
  testimonial?: {
    text: string;
    rating: number;
    approved: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const winnerSchema = new Schema<IWinner>(
  {
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    entryId: {
      type: Schema.Types.ObjectId,
      ref: 'Entry',
      required: true,
    },
    ticketNumber: {
      type: String,
      required: true,
    },
    announcedAt: {
      type: Date,
      default: Date.now,
    },
    notified: {
      type: Boolean,
      default: false,
    },
    claimed: {
      type: Boolean,
      default: false,
    },
    claimedAt: Date,
    testimonial: {
      text: String,
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      approved: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// competitionId already has unique: true and index: true above
winnerSchema.index({ userId: 1 });
winnerSchema.index({ announcedAt: -1 });

const Winner: Model<IWinner> = mongoose.model<IWinner>('Winner', winnerSchema);

export default Winner;




