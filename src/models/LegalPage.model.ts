import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILegalPage extends Document {
  slug: string;
  title: string;
  subtitle?: string;
  content: string; // Rich text content (e.g. HTML or Draft.js raw JSON string)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

const legalPageSchema = new Schema<ILegalPage>(
  {
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true, // unique: true automatically creates an index
      trim: true,
      lowercase: true,
      match: [
        /^[a-z0-9-]+$/,
        'Slug can only contain lowercase letters, numbers, and hyphens',
      ],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [500, 'Subtitle cannot exceed 500 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// slug already has unique: true which creates an index automatically
legalPageSchema.index({ isActive: 1 });

const LegalPage: Model<ILegalPage> = mongoose.model<ILegalPage>(
  'LegalPage',
  legalPageSchema
);

export default LegalPage;

