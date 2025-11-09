import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISiteStat extends Document {
  key: string;
  value: number;
  label?: string;
  description?: string;
  updatedAt: Date;
  createdAt: Date;
}

const siteStatSchema = new Schema<ISiteStat>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    value: {
      type: Number,
      required: true,
      default: 0,
    },
    label: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const SiteStat: Model<ISiteStat> = mongoose.model<ISiteStat>(
  'SiteStat',
  siteStatSchema
);

export default SiteStat;
