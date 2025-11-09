import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDraw extends Document {
  competitionId: mongoose.Types.ObjectId;
  competitionTitle: string;
  prizeName: string;
  prizeValue?: number;
  winnerId: mongoose.Types.ObjectId;
  winnerName: string;
  winnerLocation: string;
  drawDate: Date;
  drawnAt: Date;
  totalTickets: number;
  winningTicketNumber: number;
  imageUrl?: string;
  publicId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const drawSchema = new Schema<IDraw>(
  {
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: [true, 'Competition ID is required'],
    },
    competitionTitle: {
      type: String,
      required: [true, 'Competition title is required'],
      trim: true,
    },
    prizeName: {
      type: String,
      required: [true, 'Prize name is required'],
      trim: true,
    },
    prizeValue: {
      type: Number,
    },
    winnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Winner ID is required'],
    },
    winnerName: {
      type: String,
      required: [true, 'Winner name is required'],
      trim: true,
    },
    winnerLocation: {
      type: String,
      required: [true, 'Winner location is required'],
      trim: true,
    },
    drawDate: {
      type: Date,
      required: [true, 'Draw date is required'],
    },
    drawnAt: {
      type: Date,
      required: [true, 'Draw execution time is required'],
      default: Date.now,
    },
    totalTickets: {
      type: Number,
      required: [true, 'Total tickets is required'],
      min: [1, 'Total tickets must be at least 1'],
    },
    winningTicketNumber: {
      type: Number,
      required: [true, 'Winning ticket number is required'],
      min: [1, 'Winning ticket number must be at least 1'],
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
drawSchema.index({ drawDate: -1 });
drawSchema.index({ drawnAt: -1 });
drawSchema.index({ competitionId: 1 });
drawSchema.index({ winnerId: 1 });
drawSchema.index({ isActive: 1, drawnAt: -1 });

// Virtuals
drawSchema.virtual('competition', {
  ref: 'Competition',
  localField: 'competitionId',
  foreignField: '_id',
  justOne: true,
});

drawSchema.virtual('winner', {
  ref: 'User',
  localField: 'winnerId',
  foreignField: '_id',
  justOne: true,
});

const Draw: Model<IDraw> = mongoose.model<IDraw>('Draw', drawSchema);

export default Draw;
