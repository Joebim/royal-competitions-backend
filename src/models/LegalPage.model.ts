import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILegalSection {
  heading: string;
  body: string[];
  list?: {
    title?: string;
    items?: string[];
  };
}

export interface ILegalPage extends Document {
  slug: string;
  title: string;
  subtitle?: string;
  sections: ILegalSection[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

const legalSectionSchema = new Schema<ILegalSection>(
  {
    heading: {
      type: String,
      required: [true, 'Section heading is required'],
      trim: true,
      maxlength: [200, 'Heading cannot exceed 200 characters'],
    },
    body: {
      type: [String],
      required: [true, 'Section body is required'],
      validate: {
        validator: (arr: string[]) => arr.length > 0,
        message: 'Section body must contain at least one paragraph',
      },
    },
    list: {
      title: {
        type: String,
        trim: true,
        maxlength: [200, 'List title cannot exceed 200 characters'],
      },
      items: {
        type: [String],
        default: [],
      },
    },
  },
  { _id: false }
);

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
    sections: {
      type: [legalSectionSchema],
      required: [true, 'Sections are required'],
      validate: {
        validator: (arr: ILegalSection[]) => arr.length > 0,
        message: 'Page must contain at least one section',
      },
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

