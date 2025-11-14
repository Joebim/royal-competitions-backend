import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Review from '../models/Review.model';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const defaultReviews = [
  {
    title: 'Amazing experience!',
    body: 'I won a fantastic prize and the whole process was smooth and easy. The team was very professional and helpful throughout. Highly recommend!',
    rating: 5,
    reviewer: 'John Smith',
    location: 'London, UK',
    verified: true,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Great service and quick delivery',
    body: 'The customer service team was very helpful throughout the entire process. My prize arrived quickly and in perfect condition. Very satisfied!',
    rating: 5,
    reviewer: 'Sarah Johnson',
    location: 'Manchester, UK',
    verified: true,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Excellent platform',
    body: 'Love the variety of competitions available. The website is easy to use and the draw process is transparent. Will definitely participate again!',
    rating: 5,
    reviewer: 'Michael Brown',
    location: 'Birmingham, UK',
    verified: true,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Very happy with my win',
    body: 'I was skeptical at first, but I actually won! The prize was exactly as described and the claim process was straightforward. Thank you!',
    rating: 5,
    reviewer: 'Emma Wilson',
    location: 'Leeds, UK',
    verified: true,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Fair and transparent',
    body: 'The draw process is completely fair and transparent. I appreciate the live draws and the detailed information provided. Great experience overall.',
    rating: 5,
    reviewer: 'David Taylor',
    location: 'Liverpool, UK',
    verified: true,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Quick and efficient',
    body: 'Everything was handled quickly and efficiently. From entering the competition to receiving my prize, the whole process was seamless.',
    rating: 5,
    reviewer: 'Lisa Anderson',
    location: 'Glasgow, UK',
    verified: true,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Highly recommend',
    body: 'I\'ve entered several competitions and had a great experience each time. The prizes are real and the service is excellent. Highly recommend to everyone!',
    rating: 5,
    reviewer: 'Robert Martinez',
    location: 'Edinburgh, UK',
    verified: true,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Professional and trustworthy',
    body: 'The team is very professional and the platform is trustworthy. I felt confident entering competitions and was not disappointed. Great job!',
    rating: 5,
    reviewer: 'Jennifer Lee',
    location: 'Bristol, UK',
    verified: true,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Great value for money',
    body: 'The ticket prices are reasonable and the prizes are amazing. I\'ve had a lot of fun participating in various competitions. Worth every penny!',
    rating: 4,
    reviewer: 'Christopher White',
    location: 'Sheffield, UK',
    verified: true,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Smooth process',
    body: 'The entire process from entry to prize delivery was smooth. The customer support team answered all my questions promptly. Very satisfied!',
    rating: 5,
    reviewer: 'Amanda Green',
    location: 'Cardiff, UK',
    verified: true,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Excellent customer service',
    body: 'Had a question about my entry and the customer service team was very helpful and responded quickly. Great experience overall!',
    rating: 5,
    reviewer: 'James Harris',
    location: 'Newcastle, UK',
    verified: true,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Love the variety',
    body: 'There\'s such a great variety of competitions to choose from. Something for everyone! The website is user-friendly and easy to navigate.',
    rating: 5,
    reviewer: 'Michelle Clark',
    location: 'Nottingham, UK',
    verified: true,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Fast prize delivery',
    body: 'Won a prize and it was delivered much faster than expected. The packaging was excellent and everything arrived in perfect condition.',
    rating: 5,
    reviewer: 'Daniel Lewis',
    location: 'Southampton, UK',
    verified: true,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Transparent and fair',
    body: 'I appreciate how transparent the draw process is. The live draws and detailed winner information make me trust the platform completely.',
    rating: 5,
    reviewer: 'Nicole Walker',
    location: 'Portsmouth, UK',
    verified: true,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Great prizes',
    body: 'The prizes are fantastic and the competitions are exciting. I\'ve recommended this platform to all my friends and family!',
    rating: 5,
    reviewer: 'Kevin Hall',
    location: 'Brighton, UK',
    verified: true,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Easy to use',
    body: 'The website is very easy to use and navigate. Entering competitions is simple and the payment process is secure. Great platform!',
    rating: 4,
    reviewer: 'Rachel Young',
    location: 'Oxford, UK',
    verified: true,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Reliable service',
    body: 'I\'ve been using this platform for a while now and it\'s always been reliable. The draws are fair and the prizes are genuine. Highly recommend!',
    rating: 5,
    reviewer: 'Thomas King',
    location: 'Cambridge, UK',
    verified: true,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Amazing win!',
    body: 'I can\'t believe I actually won! The prize exceeded my expectations and the whole experience was fantastic. Thank you so much!',
    rating: 5,
    reviewer: 'Sophie Wright',
    location: 'York, UK',
    verified: true,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Professional team',
    body: 'The team behind this platform is very professional. They handle everything efficiently and are always available to help. Great service!',
    rating: 5,
    reviewer: 'Andrew Hill',
    location: 'Norwich, UK',
    verified: true,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Worth trying',
    body: 'I was hesitant at first, but I\'m glad I gave it a try. The competitions are fun and the prizes are real. Definitely worth participating!',
    rating: 4,
    reviewer: 'Olivia Adams',
    location: 'Exeter, UK',
    verified: false,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Good experience',
    body: 'Had a good experience overall. The website works well and the competitions are interesting. Would participate again.',
    rating: 4,
    reviewer: 'William Baker',
    location: 'Plymouth, UK',
    verified: false,
    source: 'Website',
    isActive: true,
  },
  {
    title: 'Satisfied customer',
    body: 'I\'m a satisfied customer. The platform is easy to use and the service is good. The prizes are attractive and the process is fair.',
    rating: 4,
    reviewer: 'Grace Turner',
    location: 'Bath, UK',
    verified: false,
    source: 'Website',
    isActive: true,
  },
];

const seedReviews = async () => {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/royal-competitions';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing reviews (optional - comment out if you want to keep existing)
    // await Review.deleteMany({});
    // console.log('✅ Cleared existing reviews');

    // Insert reviews with staggered dates
    const results = [];
    const now = new Date();
    
    for (let i = 0; i < defaultReviews.length; i++) {
      const reviewData = defaultReviews[i];
      
      // Check if review already exists (by title and reviewer)
      const existing = await Review.findOne({
        title: reviewData.title,
        reviewer: reviewData.reviewer,
      });

      if (existing) {
        console.log(
          `⏭️  Review "${reviewData.title}" by ${reviewData.reviewer} already exists, skipping`
        );
        results.push({ review: existing, created: false });
      } else {
        // Set publishedAt to a date in the past (staggered)
        const daysAgo = Math.floor(Math.random() * 90) + 1; // 1-90 days ago
        const publishedAt = new Date(now);
        publishedAt.setDate(publishedAt.getDate() - daysAgo);

        const review = await Review.create({
          ...reviewData,
          publishedAt,
        });
        console.log(
          `✅ Created review: "${review.title}" by ${review.reviewer} (${review.rating} stars)`
        );
        results.push({ review, created: true });
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
    console.error('❌ Error seeding reviews:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run seeder
seedReviews();

