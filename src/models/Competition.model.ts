import mongoose, { Schema, Document, Model } from 'mongoose';

export enum CompetitionStatus {
  DRAFT = 'draft',
  LIVE = 'live',
  CLOSED = 'closed',
  DRAWN = 'drawn',
  CANCELLED = 'cancelled',
}

export enum DrawMode {
  AUTOMATIC = 'automatic',
  ADMIN_TRIGGERED = 'admin_triggered',
  MANUAL = 'manual',
}

export interface IFreeEntrySection {
  heading: string;
  body: string[];
  list?: {
    title?: string;
    items?: string[];
  };
}

export interface IFreeEntryDetails {
  intro?: string;
  sections: IFreeEntrySection[];
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
  ticketPricePence: number; // Price in pence (e.g., 100 = £1.00)
  ticketLimit: number | null; // null = unlimited
  ticketsSold: number;
  status: CompetitionStatus;
  drawMode: DrawMode;
  drawAt: Date; // When the draw should occur
  freeEntryEnabled: boolean;
  noPurchasePostalAddress?: string; // Postal address for free entry
  freeEntryDetails?: IFreeEntryDetails; // Rich content for free entry/postal entry information
  termsUrl?: string; // URL to terms and conditions
  question?: {
    question: string;
    options?: string[];
    answerOptions?: string[];
    correctAnswer: string;
    explanation?: string;
  };
  features?: string[];
  included?: string[];
  specifications?: Array<{
    label: string;
    value: string;
  }>;
  slug?: string;
  tags?: string[];
  termsAndConditions?: string;
  startDate?: Date;
  endDate?: Date;
  drawnAt?: Date;
  publishedAt?: Date;
  category: string;
  featured: boolean;
  isActive: boolean;
  deletedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  nextTicketNumber: number; // Sequential ticket number assignment
  createdAt: Date;
  updatedAt: Date;
  getAvailableTickets(): number;
  getSoldPercentage(): number;
  getRemainingTickets(): number;
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
    termsUrl: {
      type: String,
      trim: true,
    },
    ticketPricePence: {
      type: Number,
      required: [true, 'Ticket price is required'],
      min: [1, 'Ticket price must be at least 1 pence'],
    },
    ticketLimit: {
      type: Number,
      default: null, // null = unlimited
      min: [1, 'Ticket limit must be at least 1'],
      max: [1000000, 'Cannot exceed 1,000,000 tickets'],
    },
    ticketsSold: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(CompetitionStatus),
      default: CompetitionStatus.DRAFT,
    },
    drawMode: {
      type: String,
      enum: Object.values(DrawMode),
      default: DrawMode.AUTOMATIC,
    },
    drawAt: {
      type: Date,
      required: [true, 'Draw date is required'],
    },
    drawnAt: Date,
    freeEntryEnabled: {
      type: Boolean,
      default: false,
    },
    noPurchasePostalAddress: {
      type: String,
      trim: true,
    },
    freeEntryDetails: {
      intro: {
        type: String,
        trim: true,
        maxlength: [4000, 'Free entry intro cannot exceed 4000 characters'],
      },
      sections: [
        {
          heading: {
            type: String,
            required: [true, 'Free entry section heading is required'],
            trim: true,
            maxlength: [200, 'Heading cannot exceed 200 characters'],
          },
          body: {
            type: [String],
            required: [true, 'Free entry section body is required'],
            validate: {
              validator: (arr: string[]) => arr.length > 0,
              message:
                'Free entry section body must contain at least one paragraph',
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
      ],
    },
    question: {
      question: {
        type: String,
        trim: true,
      },
      options: [String],
      answerOptions: [String],
      correctAnswer: {
        type: String,
        trim: true,
      },
      explanation: {
        type: String,
        trim: true,
      },
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
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      // No enum - categories are stored in database and can be dynamically created
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
    nextTicketNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
competitionSchema.index({ status: 1, drawAt: 1 });
competitionSchema.index({ category: 1, status: 1 });
competitionSchema.index({ featured: 1, status: 1 });
competitionSchema.index({ createdAt: -1 });
competitionSchema.index({ slug: 1 }, { unique: true, sparse: true });
competitionSchema.index({ drawAt: 1, status: 1 }); // For draw scheduler

// Validate sold tickets doesn't exceed ticket limit (if set)
competitionSchema.pre('save', function (next) {
  if (this.ticketLimit !== null && this.ticketsSold > this.ticketLimit) {
    throw new Error('Sold tickets cannot exceed ticket limit');
  }
  next();
});

// Get available tickets
competitionSchema.methods.getAvailableTickets = function (): number {
  if (this.ticketLimit === null) {
    return Infinity;
  }
  return Math.max(0, this.ticketLimit - this.ticketsSold);
};

// Get remaining tickets (alias for getAvailableTickets)
competitionSchema.methods.getRemainingTickets = function (): number {
  return this.getAvailableTickets();
};

// Get sold percentage
competitionSchema.methods.getSoldPercentage = function (): number {
  if (this.ticketLimit === null || this.ticketLimit === 0) {
    return 0;
  }
  return Math.min(100, (this.ticketsSold / this.ticketLimit) * 100);
};

// Virtual for tickets
competitionSchema.virtual('tickets', {
  ref: 'Ticket',
  localField: '_id',
  foreignField: 'competitionId',
});

const Competition: Model<ICompetition> = mongoose.model<ICompetition>(
  'Competition',
  competitionSchema
);

export default Competition;
