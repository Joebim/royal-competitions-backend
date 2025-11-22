import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  emailVerificationToken?: string;
  emailVerificationExpire?: Date;
  passwordResetToken?: string;
  passwordResetExpire?: Date;
  subscribedToNewsletter: boolean;
  mailchimpSubscriberId?: string;
  referralCode?: string; // Unique referral code for this user
  referredBy?: mongoose.Types.ObjectId; // User ID who referred this user
  hasReceivedReferralReward?: boolean; // Track if referrer has received reward for this referral
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getFullName(): string;
}

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^(\+44|0)[1-9]\d{9}$/, 'Please provide a valid UK phone number'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    passwordResetToken: String,
    passwordResetExpire: Date,
    subscribedToNewsletter: {
      type: Boolean,
      default: false,
    },
    mailchimpSubscriberId: String,
    referralCode: {
      type: String,
      unique: true,
      sparse: true, // Allow null values but enforce uniqueness for non-null values
      trim: true,
      uppercase: true,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    hasReceivedReferralReward: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
// email already has unique: true which creates an index automatically
// referralCode already has unique: true which creates an index automatically
userSchema.index({ createdAt: -1 });
userSchema.index({ referredBy: 1 }); // Index for finding users referred by someone

// Generate referral code before saving (if new user and no code exists)
userSchema.pre('save', async function (next) {
  // Generate unique referral code for new users
  if (this.isNew && !this.referralCode) {
    let code: string = '';
    let isUnique = false;

    // Generate a unique referral code (8 alphanumeric characters)
    while (!isUnique) {
      // Use first 3 letters of first name + last 3 of last name + random 2 chars
      const firstNamePart = (this.firstName || 'USR')
        .substring(0, 3)
        .toUpperCase()
        .padEnd(3, 'X');
      const lastNamePart = (this.lastName || 'REF')
        .substring(Math.max(0, (this.lastName || '').length - 3))
        .toUpperCase()
        .padStart(3, 'X');
      const randomPart = Math.random()
        .toString(36)
        .substring(2, 4)
        .toUpperCase();
      code = `${firstNamePart}${lastNamePart}${randomPart}`.substring(0, 8);

      // Check if code already exists (use mongoose.model to avoid circular dependency)
      const existing = await mongoose.connection.models.User?.findOne({
        referralCode: code,
      });
      if (!existing) {
        isUnique = true;
      }
    }

    this.referralCode = code;
  }

  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get full name method
userSchema.methods.getFullName = function (): string {
  return `${this.firstName} ${this.lastName}`;
};

// Virtual for user's orders
userSchema.virtual('orders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'userId',
});

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
