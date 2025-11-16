import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICompanyDetails {
  companyName: string;
  tradingAs: string;
  companyNumber: string;
  location: string;
}

export interface IFeature {
  icon: string; // Icon identifier (e.g., 'FaTrophy', 'FaUsers')
  title: string;
  description: string;
}

export interface IAboutPage extends Document {
  hero: {
    title: string;
    subtitle: string;
  };
  story: {
    heading: string;
    paragraphs: string[];
  };
  companyDetails: ICompanyDetails;
  features: IFeature[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

const companyDetailsSchema = new Schema<ICompanyDetails>(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [200, 'Company name cannot exceed 200 characters'],
    },
    tradingAs: {
      type: String,
      required: [true, 'Trading as is required'],
      trim: true,
      maxlength: [200, 'Trading as cannot exceed 200 characters'],
    },
    companyNumber: {
      type: String,
      required: [true, 'Company number is required'],
      trim: true,
      maxlength: [50, 'Company number cannot exceed 50 characters'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters'],
    },
  },
  { _id: false }
);

const featureSchema = new Schema<IFeature>(
  {
    icon: {
      type: String,
      required: [true, 'Icon is required'],
      trim: true,
      maxlength: [100, 'Icon cannot exceed 100 characters'],
    },
    title: {
      type: String,
      required: [true, 'Feature title is required'],
      trim: true,
      maxlength: [200, 'Feature title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Feature description is required'],
      trim: true,
      maxlength: [500, 'Feature description cannot exceed 500 characters'],
    },
  },
  { _id: false }
);

const aboutPageSchema = new Schema<IAboutPage>(
  {
    hero: {
      title: {
        type: String,
        required: [true, 'Hero title is required'],
        trim: true,
        maxlength: [200, 'Hero title cannot exceed 200 characters'],
      },
      subtitle: {
        type: String,
        required: [true, 'Hero subtitle is required'],
        trim: true,
        maxlength: [500, 'Hero subtitle cannot exceed 500 characters'],
      },
    },
    story: {
      heading: {
        type: String,
        required: [true, 'Story heading is required'],
        trim: true,
        maxlength: [200, 'Story heading cannot exceed 200 characters'],
      },
      paragraphs: {
        type: [String],
        required: [true, 'Story paragraphs are required'],
        validate: {
          validator: (arr: string[]) => arr.length > 0,
          message: 'Story must contain at least one paragraph',
        },
      },
    },
    companyDetails: {
      type: companyDetailsSchema,
      required: [true, 'Company details are required'],
    },
    features: {
      type: [featureSchema],
      required: [true, 'Features are required'],
      validate: {
        validator: (arr: IFeature[]) => arr.length > 0,
        message: 'At least one feature is required',
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

// Index for active pages
aboutPageSchema.index({ isActive: 1 });

const AboutPage: Model<IAboutPage> = mongoose.model<IAboutPage>(
  'AboutPage',
  aboutPageSchema
);

export default AboutPage;

