import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReview extends Document {
  title: string;
  body: string;
  rating: number;
  reviewer: string;
  location?: string;
  verified: boolean;
  timeAgo?: string;
  source?: string;
  publishedAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    body: {
      type: String,
      required: [true, 'Body is required'],
      trim: true,
      maxlength: [1000, 'Review cannot exceed 1000 characters'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    reviewer: {
      type: String,
      required: [true, 'Reviewer name is required'],
      trim: true,
      maxlength: [80, 'Reviewer name cannot exceed 80 characters'],
    },
    location: {
      type: String,
      trim: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    timeAgo: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ publishedAt: -1 });
reviewSchema.index({ rating: -1 });

const Review: Model<IReview> = mongoose.model<IReview>('Review', reviewSchema);

export default Review;


