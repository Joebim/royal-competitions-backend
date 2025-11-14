import mongoose, { Schema, Document, Model } from 'mongoose';

export enum DrawMethod {
  AUTOMATIC = 'automatic',
  ADMIN_TRIGGERED = 'admin_triggered',
  MANUAL = 'manual',
}

export interface IDrawResult {
  ticketNumber: number;
  ticketId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
}

export interface IDraw extends Document {
  competitionId: mongoose.Types.ObjectId;
  drawTime: Date; // When the draw occurred
  seed: string; // Hex string seed for RNG
  algorithm: string; // Algorithm used (e.g., 'hmac-sha256-v1')
  snapshotTicketCount: number; // Number of tickets at snapshot time
  snapshotReference?: string; // Path/URL to snapshot file
  snapshot?: any; // Embedded snapshot data (optional)
  result: IDrawResult[]; // Array of winners (primary + reserves)
  drawMethod: DrawMethod;
  initiatedBy?: mongoose.Types.ObjectId; // Admin who triggered (if admin_triggered)
  notes?: string; // Manual entry notes
  evidenceUrl?: string; // URL to draw video/evidence (for manual)
  liveUrl?: string; // URL to watch the draw live (e.g., YouTube, Vimeo, custom)
  urlType?: string; // Type of URL to help frontend render (e.g., 'youtube', 'vimeo', 'custom')
  createdAt: Date;
  updatedAt: Date;
}

const drawResultSchema = new Schema<IDrawResult>(
  {
    ticketNumber: {
      type: Number,
      required: true,
    },
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: false }
);

const drawSchema = new Schema<IDraw>(
  {
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: [true, 'Competition ID is required'],
    },
    drawTime: {
      type: Date,
      required: [true, 'Draw time is required'],
      default: Date.now,
    },
    seed: {
      type: String,
      required: [true, 'Seed is required'],
      trim: true,
    },
    algorithm: {
      type: String,
      required: [true, 'Algorithm is required'],
      default: 'hmac-sha256-v1',
      trim: true,
    },
    snapshotTicketCount: {
      type: Number,
      required: [true, 'Snapshot ticket count is required'],
      min: [1, 'Snapshot ticket count must be at least 1'],
    },
    snapshotReference: {
      type: String,
      trim: true,
    },
    snapshot: {
      type: Schema.Types.Mixed, // Store snapshot as JSON
    },
    result: {
      type: [drawResultSchema],
      required: [true, 'Draw result is required'],
      default: [],
    },
    drawMethod: {
      type: String,
      enum: Object.values(DrawMethod),
      required: [true, 'Draw method is required'],
      default: DrawMethod.AUTOMATIC,
    },
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    evidenceUrl: {
      type: String,
      trim: true,
    },
    liveUrl: {
      type: String,
      trim: true,
    },
    urlType: {
      type: String,
      trim: true,
      enum: ['youtube', 'vimeo', 'twitch', 'custom', 'other'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
drawSchema.index({ competitionId: 1, drawTime: -1 });
drawSchema.index({ drawTime: -1 });
drawSchema.index({ drawMethod: 1 });

// Virtuals
drawSchema.virtual('competition', {
  ref: 'Competition',
  localField: 'competitionId',
  foreignField: '_id',
  justOne: true,
});

const Draw: Model<IDraw> = mongoose.model<IDraw>('Draw', drawSchema);

export default Draw;
