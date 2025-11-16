import { connectDatabase, disconnectDatabase } from '../config/database';
import { User, UserRole } from '../models';
import logger from '../utils/logger';

/**
 * Seed script to create core admin users.
 *
 * This will create or update the following admin accounts:
 * - Lukasz  (lukasz.bujnowski0@outlook.com)
 * - Marco   (Marco_dacosta1999@hotmail.com)
 * - Brian   (brianjosephdias@gmail.com)
 *
 * Each account will be given a default password if it doesn't already exist.
 * The plaintext passwords are logged to the console ONLY when this script runs,
 * so you can capture them and then change them in the admin UI.
 *
 * Usage:
 *  - npm run seed:admins
 *  - or: npx ts-node src/scripts/seedAdmins.ts
 */

const adminSeeds = [
  {
    firstName: 'Lukasz',
    lastName: 'Bujnowski',
    email: 'lukasz.bujnowski0@outlook.com',
    password: 'LukaszAdmin123!',
  },
  {
    firstName: 'Marco',
    lastName: 'Da Costa',
    email: 'Marco_dacosta1999@hotmail.com',
    password: 'MarcoAdmin123!',
  },
  {
    firstName: 'Brian',
    lastName: 'Dias',
    email: 'brianjosephdias@gmail.com',
    password: 'BrianAdmin123!',
  },
];

const seedAdmins = async () => {
  try {
    await connectDatabase();
    console.log('✅ Connected to MongoDB');

    for (const admin of adminSeeds) {
      const existing = await User.findOne({ email: admin.email.toLowerCase() });

      if (existing) {
        // Update existing user to admin role, keep existing password unless you explicitly want to reset
        existing.firstName = admin.firstName;
        existing.lastName = admin.lastName;
        existing.role = UserRole.ADMIN;
        existing.isVerified = true;
        existing.isActive = true;
        // Only set password if they don't have one yet
        if (!existing.password) {
          existing.password = admin.password;
        }
        await existing.save();

        logger.info(`Updated admin user: ${admin.email}`);
        console.log(`🔄 Updated admin: ${admin.email}`);
      } else {
        await User.create({
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email.toLowerCase(),
          password: admin.password,
          role: UserRole.ADMIN,
          isVerified: true,
          isActive: true,
        });

        logger.info(`Created admin user: ${admin.email}`);
        console.log(`✅ Created admin: ${admin.email}`);
      }

      // Log credentials so you can log in and then change the password
      console.log(`   Email: ${admin.email}`);
      console.log(`   Password: ${admin.password}`);
      console.log('   Role: ADMIN\n');
    }

    console.log('✅ Admin seeding complete. Please change these passwords after first login.');
    await disconnectDatabase();
    process.exit(0);
  } catch (error: any) {
    logger.error('Error seeding admins:', error);
    console.error('❌ Error seeding admins:', error.message);
    await disconnectDatabase();
    process.exit(1);
  }
};

if (require.main === module) {
  seedAdmins();
}

export default seedAdmins;


