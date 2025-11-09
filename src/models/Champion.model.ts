import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChampion extends Document {
  drawId: mongoose.Types.ObjectId;
  competitionId: mongoose.Types.ObjectId;
  winnerId: mongoose.Types.ObjectId;
  winnerName: string;
  winnerLocation: string;
  prizeName: string;
  prizeValue?: string;
  testimonial: string;
  image: {
    url: string;
    publicId: string;
  };
  featured: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const championSchema = new Schema<IChampion>(
  {
    drawId: {
      type: Schema.Types.ObjectId,
      ref: 'Draw',
      required: [true, 'Draw ID is required'],
    },
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: [true, 'Competition ID is required'],
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
      maxlength: [100, 'Winner name cannot exceed 100 characters'],
    },
    winnerLocation: {
      type: String,
      required: [true, 'Winner location is required'],
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
    },
    prizeName: {
      type: String,
      required: [true, 'Prize name is required'],
      trim: true,
      maxlength: [200, 'Prize name cannot exceed 200 characters'],
    },
    prizeValue: {
      type: String,
      trim: true,
    },
    testimonial: {
      type: String,
      required: [true, 'Testimonial is required'],
      trim: true,
      maxlength: [1000, 'Testimonial cannot exceed 1000 characters'],
    },
    image: {
      url: {
        type: String,
        required: [true, 'Image URL is required'],
      },
      publicId: {
        type: String,
        required: [true, 'Image public ID is required'],
      },
    },
    featured: {
      type: Boolean,
      default: false,
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
championSchema.index({ featured: 1, isActive: 1 });
championSchema.index({ createdAt: -1 });
championSchema.index({ winnerId: 1 });
championSchema.index({ competitionId: 1 });
championSchema.index({ drawId: 1 });

// Virtuals
championSchema.virtual('draw', {
  ref: 'Draw',
  localField: 'drawId',
  foreignField: '_id',
  justOne: true,
});

championSchema.virtual('competition', {
  ref: 'Competition',
  localField: 'competitionId',
  foreignField: '_id',
  justOne: true,
});

championSchema.virtual('winner', {
  ref: 'User',
  localField: 'winnerId',
  foreignField: '_id',
  justOne: true,
});

const Champion: Model<IChampion> = mongoose.model<IChampion>(
  'Champion',
  championSchema
);

export default Champion;
