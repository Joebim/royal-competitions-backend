import mongoose, { Schema, Document, Model } from 'mongoose';

export enum HomePageSectionType {
  COMPETITIONS = 'competitions',
  CHAMPIONS = 'champions',
  STATS = 'stats',
  RECENT_DRAWS = 'recentDraws',
  REVIEWS = 'reviews',
}

export interface IHomePageSection extends Document {
  type: HomePageSectionType;
  order: number; // Display order (0 = first after hero, 1 = second, etc.)
  heading?: string; // Section heading
  subheading?: string; // Section subheading
  isActive: boolean; // Whether section is visible
  createdAt: Date;
  updatedAt: Date;
}

const homePageSectionSchema = new Schema<IHomePageSection>(
  {
    type: {
      type: String,
      enum: Object.values(HomePageSectionType),
      required: [true, 'Section type is required'],
      unique: true, // Only one instance of each section type
    },
    order: {
      type: Number,
      required: [true, 'Order is required'],
      min: [0, 'Order must be 0 or greater'],
    },
    heading: {
      type: String,
      trim: true,
      maxlength: [200, 'Heading cannot exceed 200 characters'],
    },
    subheading: {
      type: String,
      trim: true,
      maxlength: [500, 'Subheading cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying by order
homePageSectionSchema.index({ order: 1 });
// Note: type field already has an index from unique: true, so we don't need to add it again

const HomePageSection: Model<IHomePageSection> =
  mongoose.model<IHomePageSection>('HomePageSection', homePageSectionSchema);

export default HomePageSection;
