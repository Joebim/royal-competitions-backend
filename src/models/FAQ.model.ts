import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFAQ extends Document {
  id: string;
  question: string;
  answer: string;
  category?: string;
  order?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

const faqSchema = new Schema<IFAQ>(
  {
    id: {
      type: String,
      required: [true, 'FAQ ID is required'],
      unique: true, // unique: true automatically creates an index
      trim: true,
      match: [/^faq-\d{3}$/, 'FAQ ID must be in format faq-XXX (e.g., faq-001)'],
    },
    question: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
      maxlength: [500, 'Question cannot exceed 500 characters'],
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
      trim: true,
      maxlength: [5000, 'Answer cannot exceed 5000 characters'],
    },
    category: {
      type: String,
      trim: true,
      enum: {
        values: [
          'General',
          'Competitions',
          'Draws',
          'Payments',
          'Account',
          'Prizes',
          'Technical',
        ],
        message: 'Invalid category',
      },
    },
    order: {
      type: Number,
      default: 0,
      min: [0, 'Order must be zero or greater'],
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

// id already has unique: true which creates an index automatically
faqSchema.index({ category: 1 });
faqSchema.index({ isActive: 1 });
faqSchema.index({ order: 1 });

const FAQ: Model<IFAQ> = mongoose.model<IFAQ>('FAQ', faqSchema);

export default FAQ;

