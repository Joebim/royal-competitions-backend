import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INewsletter extends Document {
  email: string;
  firstName?: string;
  lastName?: string;
  mailchimpSubscriberId?: string;
  status: 'subscribed' | 'unsubscribed' | 'pending';
  source: 'website' | 'checkout' | 'admin' | 'footer';
  subscribedAt: Date;
  unsubscribedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const newsletterSchema = new Schema<INewsletter>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    firstName: String,
    lastName: String,
    mailchimpSubscriberId: String,
    status: {
      type: String,
      enum: ['subscribed', 'unsubscribed', 'pending'],
      default: 'pending',
    },
    source: {
      type: String,
      enum: ['website', 'checkout', 'admin', 'footer'],
      default: 'website',
    },
    subscribedAt: Date,
    unsubscribedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
// email already has unique: true and index: true above
newsletterSchema.index({ status: 1 });

const Newsletter: Model<INewsletter> = mongoose.model<INewsletter>(
  'Newsletter',
  newsletterSchema
);

export default Newsletter;




