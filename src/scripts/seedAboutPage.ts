import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import AboutPage from '../models/AboutPage.model';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const aboutPageData = {
  hero: {
    title: 'About Royal Competitions',
    subtitle: 'The UK and Ireland\'s leading competition company',
  },
  story: {
    heading: 'Our Story',
    paragraphs: [
      'RYL Competitions Limited, trading as Royal Competitions. Founded by Brian, Lukasz and Marco, our team combines our backgrounds within Accounting and Business Management to create a competition platform built on trust, fairness and excitement.',
      'We\'re committed to running every draw transparently and responsibly, ensuring every participant has a fair and enjoyable experience. Our dedication to integrity and customer satisfaction has made us a trusted name in the competition industry.',
      'Thank you for being part of our journey.',
      'Marco',
    ],
  },
  companyDetails: {
    companyName: 'RYL Competitions Limited',
    tradingAs: 'Royal Competitions',
    companyNumber: 'TBC', // Update with actual company number when available
    location: 'UK & Ireland',
  },
  features: [
    {
      icon: 'FaTrophy',
      title: 'Premium Prizes',
      description: 'We offer the most luxurious and exciting prizes in the UK and Ireland.',
    },
    {
      icon: 'FaUsers',
      title: 'Trusted by Thousands',
      description: 'Join thousands of satisfied customers who trust Royal Competitions.',
    },
    {
      icon: 'FaHeart',
      title: 'Transparent & Fair',
      description: 'We\'re committed to running every draw transparently and responsibly.',
    },
    {
      icon: 'FaAward',
      title: 'Built on Trust',
      description: 'A competition platform built on trust, fairness and excitement.',
    },
  ],
  isActive: true,
};

const seedAboutPage = async () => {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/royal-competitions';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if about page already exists
    const existingAboutPage = await AboutPage.findOne();

    if (existingAboutPage) {
      console.log('📝 About page already exists, updating...');
      
      // Update existing page
      existingAboutPage.hero = aboutPageData.hero;
      existingAboutPage.story = aboutPageData.story;
      existingAboutPage.companyDetails = aboutPageData.companyDetails;
      existingAboutPage.features = aboutPageData.features;
      existingAboutPage.isActive = aboutPageData.isActive;
      
      await existingAboutPage.save();
      console.log('✅ About page updated successfully');
      console.log(`   Hero Title: ${existingAboutPage.hero.title}`);
      console.log(`   Company: ${existingAboutPage.companyDetails.companyName}`);
      console.log(`   Trading As: ${existingAboutPage.companyDetails.tradingAs}`);
      console.log(`   Features: ${existingAboutPage.features.length} features`);
    } else {
      console.log('🆕 Creating new about page...');
      
      const aboutPage = await AboutPage.create(aboutPageData);
      console.log('✅ About page created successfully');
      console.log(`   Hero Title: ${aboutPage.hero.title}`);
      console.log(`   Company: ${aboutPage.companyDetails.companyName}`);
      console.log(`   Trading As: ${aboutPage.companyDetails.tradingAs}`);
      console.log(`   Features: ${aboutPage.features.length} features`);
    }

    console.log('\n📊 Summary:');
    console.log('   Status: ✅ Complete');
    console.log('   Action:', existingAboutPage ? 'Updated' : 'Created');

    await mongoose.disconnect();
    console.log('\n✅ Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding about page:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run seeder
seedAboutPage();

