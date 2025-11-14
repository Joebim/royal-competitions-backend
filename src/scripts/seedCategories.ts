import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Category from '../models/Category.model';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const defaultCategories = [
  {
    name: 'Luxury Cars',
    isUserCreated: false,
    isActive: true,
  },
  {
    name: 'Tech & Gadgets',
    isUserCreated: false,
    isActive: true,
  },
  {
    name: 'Holidays',
    isUserCreated: false,
    isActive: true,
  },
  {
    name: 'Cash Prizes',
    isUserCreated: false,
    isActive: true,
  },
  {
    name: 'Home & Garden',
    isUserCreated: false,
    isActive: true,
  },
  {
    name: 'Fashion & Watches',
    isUserCreated: false,
    isActive: true,
  },
  {
    name: 'Experiences',
    isUserCreated: false,
    isActive: true,
  },
  {
    name: 'Other',
    isUserCreated: false,
    isActive: true,
  },
];

const seedCategories = async () => {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/royal-competitions';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing categories (optional - comment out if you want to keep existing)
    // await Category.deleteMany({});
    // console.log('✅ Cleared existing categories');

    // Insert categories
    const results = [];
    for (const categoryData of defaultCategories) {
      // Check if category already exists
      const existing = await Category.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${categoryData.name}$`, 'i') } },
          { slug: categoryData.name.toLowerCase().replace(/\s+/g, '-') },
        ],
      });

      if (existing) {
        console.log(`⏭️  Category "${categoryData.name}" already exists, skipping`);
        results.push({ category: existing, created: false });
      } else {
        const category = await Category.create(categoryData);
        console.log(`✅ Created category: ${category.name}`);
        results.push({ category, created: true });
      }
    }

    console.log('\n📊 Summary:');
    const created = results.filter((r) => r.created).length;
    const skipped = results.filter((r) => !r.created).length;
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${results.length}`);

    await mongoose.disconnect();
    console.log('\n✅ Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run seeder
seedCategories();

