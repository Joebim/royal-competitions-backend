import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWinner extends Document {
  drawId: mongoose.Types.ObjectId;
  competitionId: mongoose.Types.ObjectId;
  ticketId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  ticketNumber: number;
  prize: string;
  notified: boolean;
  notifiedAt?: Date;
  claimed: boolean;
  claimedAt?: Date;
  claimCode: string; // Unique code for winner verification
  proofImageUrl?: string; // URL to winner proof image
  drawVideoUrl?: string; // URL to draw video
  testimonial?: {
    text: string;
    rating?: number;
    approved: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const winnerSchema = new Schema<IWinner>(
  {
    drawId: {
      type: Schema.Types.ObjectId,
      ref: 'Draw',
      required: true,
    },
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
    },
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      unique: true, // unique: true automatically creates an index
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    ticketNumber: {
      type: Number,
      required: true,
    },
    prize: {
      type: String,
      required: true,
      trim: true,
    },
    notified: {
      type: Boolean,
      default: false,
    },
    notifiedAt: Date,
    claimed: {
      type: Boolean,
      default: false,
    },
    claimedAt: Date,
    claimCode: {
      type: String,
      required: true,
      unique: true, // unique: true automatically creates an index
      trim: true,
    },
    proofImageUrl: {
      type: String,
      trim: true,
    },
    drawVideoUrl: {
      type: String,
      trim: true,
    },
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
winnerSchema.index({ competitionId: 1, createdAt: -1 });
winnerSchema.index({ userId: 1 });
winnerSchema.index({ notified: 1, claimed: 1 });

// Generate claim code before saving
winnerSchema.pre('save', async function (next) {
  if (!this.claimCode) {
    // Generate unique claim code: ABCD-1234 format
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const part1 = Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    const part2 = Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    this.claimCode = `${part1}-${part2}`;
  }
  next();
});

const Winner: Model<IWinner> = mongoose.model<IWinner>('Winner', winnerSchema);

export default Winner;




