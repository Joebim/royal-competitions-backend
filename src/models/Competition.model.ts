import mongoose, { Schema, Document, Model } from 'mongoose';

export enum CompetitionStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  DRAWING = 'drawing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface IQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface ICompetition extends Document {
  title: string;
  shortDescription?: string;
  description: string;
  prize: string;
  prizeValue?: number;
  cashAlternative?: number;
  cashAlternativeDetails?: string;
  originalPrice?: number;
  images: Array<{
    url: string;
    publicId: string;
    thumbnail?: string;
  }>;
  ticketPrice: number;
  maxTickets: number;
  soldTickets: number;
  status: CompetitionStatus;
  question: IQuestion;
  features?: string[];
  included?: string[];
  specifications?: Array<{
    label: string;
    value: string;
  }>;
  slug?: string;
  tags?: string[];
  termsAndConditions?: string;
  drawDate: Date;
  startDate?: Date;
  endDate?: Date;
  drawnAt?: Date;
  publishedAt?: Date;
  isGuaranteedDraw?: boolean;
  winnerId?: mongoose.Types.ObjectId;
  category: string;
  featured: boolean;
  isActive: boolean;
  deletedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  getAvailableTickets(): number;
  getSoldPercentage(): number;
}

const competitionSchema = new Schema<ICompetition>(
  {
    title: {
      type: String,
      required: [true, 'Competition title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [280, 'Short description cannot exceed 280 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    prize: {
      type: String,
      required: [true, 'Prize is required'],
      trim: true,
    },
    prizeValue: {
      type: Number,
      min: [0, 'Prize value must be zero or greater'],
    },
    cashAlternative: {
      type: Number,
      min: [0, 'Cash alternative must be zero or greater'],
    },
    cashAlternativeDetails: {
      type: String,
      trim: true,
      maxlength: [500, 'Cash alternative details cannot exceed 500 characters'],
    },
    originalPrice: {
      type: Number,
      min: [0, 'Original price must be zero or greater'],
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          required: true,
        },
        thumbnail: String,
      },
    ],
    features: {
      type: [String],
      default: undefined,
    },
    included: {
      type: [String],
      default: undefined,
    },
    specifications: [
      {
        label: {
          type: String,
          required: true,
        },
        value: {
          type: String,
          required: true,
        },
        _id: false,
      },
    ],
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    tags: {
      type: [String],
      default: undefined,
    },
    termsAndConditions: {
      type: String,
      trim: true,
    },
    ticketPrice: {
      type: Number,
      required: [true, 'Ticket price is required'],
      min: [0.5, 'Ticket price must be at least £0.50'],
    },
    maxTickets: {
      type: Number,
      required: [true, 'Maximum tickets is required'],
      min: [10, 'Must have at least 10 tickets'],
      max: [100000, 'Cannot exceed 100,000 tickets'],
    },
    soldTickets: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(CompetitionStatus),
      default: CompetitionStatus.DRAFT,
    },
    question: {
      question: {
        type: String,
        required: [true, 'Question is required'],
      },
      options: {
        type: [String],
        required: [true, 'Question options are required'],
        validate: {
          validator: (v: string[]) => v.length >= 2 && v.length <= 6,
          message: 'Question must have between 2 and 6 options',
        },
      },
      correctAnswer: {
        type: String,
        required: [true, 'Correct answer is required'],
      },
      explanation: {
        type: String,
      },
    },
    drawDate: {
      type: Date,
      required: [true, 'Draw date is required'],
      validate: {
        validator: function (v: Date) {
          return v > new Date();
        },
        message: 'Draw date must be in the future',
      },
    },
    drawnAt: Date,
    winnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    publishedAt: {
      type: Date,
    },
    isGuaranteedDraw: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Luxury Cars',
        'Tech & Gadgets',
        'Holidays',
        'Cash Prizes',
        'Home & Garden',
        'Fashion & Watches',
        'Experiences',
        'Other',
      ],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
competitionSchema.index({ status: 1, drawDate: 1 });
competitionSchema.index({ category: 1, status: 1 });
competitionSchema.index({ featured: 1, status: 1 });
competitionSchema.index({ createdAt: -1 });
competitionSchema.index({ slug: 1 }, { unique: true, sparse: true });

// Validate sold tickets doesn't exceed max tickets
competitionSchema.pre('save', function (next) {
  if (this.soldTickets > this.maxTickets) {
    throw new Error('Sold tickets cannot exceed maximum tickets');
  }
  next();
});

// Get available tickets
competitionSchema.methods.getAvailableTickets = function (): number {
  return this.maxTickets - this.soldTickets;
};

// Get sold percentage
competitionSchema.methods.getSoldPercentage = function (): number {
  return (this.soldTickets / this.maxTickets) * 100;
};

// Virtual for entries
competitionSchema.virtual('entries', {
  ref: 'Entry',
  localField: '_id',
  foreignField: 'competitionId',
});

const Competition: Model<ICompetition> = mongoose.model<ICompetition>(
  'Competition',
  competitionSchema
);

export default Competition;
