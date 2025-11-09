import { User, UserRole } from '../models';
import logger from '../utils/logger';
import { connectDatabase } from '../config/database';

/**
 * Seed script to create the first super admin user
 * 
 * Usage: 
 * - Set environment variables:
 *   SUPER_ADMIN_EMAIL=admin@royalcompetitions.co.uk
 *   SUPER_ADMIN_PASSWORD=your_secure_password
 *   SUPER_ADMIN_FIRST_NAME=Admin
 *   SUPER_ADMIN_LAST_NAME=User
 * 
 * - Run: npm run seed:super-admin
 *   or: npx ts-node src/scripts/seedSuperAdmin.ts
 */

const seedSuperAdmin = async () => {
  try {
    // Connect to database
    await connectDatabase();

    const email = process.env.SUPER_ADMIN_EMAIL || 'admin@royalcompetitions.co.uk';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin123!@#';
    const firstName = process.env.SUPER_ADMIN_FIRST_NAME || 'Super';
    const lastName = process.env.SUPER_ADMIN_LAST_NAME || 'Admin';

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({
      role: UserRole.SUPER_ADMIN,
    });

    if (existingSuperAdmin) {
      logger.info('Super admin already exists');
      console.log('✅ Super admin already exists');
      process.exit(0);
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Update existing user to super admin
      existingUser.role = UserRole.SUPER_ADMIN;
      existingUser.isVerified = true;
      existingUser.isActive = true;
      if (password !== 'Admin123!@#') {
        existingUser.password = password; // Will be hashed by pre-save hook
      }
      await existingUser.save();
      logger.info(`Existing user ${email} upgraded to super admin`);
      console.log(`✅ Existing user ${email} upgraded to super admin`);
      process.exit(0);
    }

    // Create super admin
    await User.create({
      firstName,
      lastName,
      email,
      password,
      role: UserRole.SUPER_ADMIN,
      isVerified: true,
      isActive: true,
    });

    logger.info(`Super admin created: ${email}`);
    console.log('✅ Super admin created successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: SUPER_ADMIN`);
    console.log('\n⚠️  Please change the password after first login!');

    process.exit(0);
  } catch (error: any) {
    logger.error('Error seeding super admin:', error);
    console.error('❌ Error creating super admin:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedSuperAdmin();
}

export default seedSuperAdmin;
