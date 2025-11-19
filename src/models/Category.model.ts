import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  isActive: boolean;
  isUserCreated: boolean; // True if created by a user, false if system/default
  createdBy?: mongoose.Types.ObjectId; // User who created it (if userCreated)
  usageCount: number; // Number of competitions using this category
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: false, // Auto-generated from name
      unique: true,
      lowercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isUserCreated: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// slug already has unique: true which creates an index automatically
categorySchema.index({ isActive: 1 });
categorySchema.index({ isUserCreated: 1 });
categorySchema.index({ usageCount: -1 });

// Generate slug from name before saving
categorySchema.pre('save', function (next) {
  // Always generate slug if it's not set or if name has changed
  if (!this.slug || this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }
  next();
});

const Category: Model<ICategory> = mongoose.model<ICategory>(
  'Category',
  categorySchema
);

export default Category;

