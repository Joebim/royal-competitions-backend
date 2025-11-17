import dotenv from 'dotenv';
import path from 'path';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { User, UserRole } from '../models';
import logger from '../utils/logger';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Seed script to create core admin users.
 *
 * This will create or update the following admin accounts:
 * - Lukasz  (lukasz.bujnowski0@outlook.com)
 * - Marco   (Marco_dacosta1999@hotmail.com)
 * - Brian   (brianjosephdias@gmail.com)
 *
 * Passwords are read from environment variables for security.
 * Set the following in your .env file:
 * - SEED_ADMIN_LUKASZ_PASSWORD
 * - SEED_ADMIN_MARCO_PASSWORD
 * - SEED_ADMIN_BRIAN_PASSWORD
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
    passwordEnv: 'SEED_ADMIN_LUKASZ_PASSWORD',
  },
  {
    firstName: 'Marco',
    lastName: 'Da Costa',
    email: 'Marco_dacosta1999@hotmail.com',
    passwordEnv: 'SEED_ADMIN_MARCO_PASSWORD',
  },
  {
    firstName: 'Brian',
    lastName: 'Dias',
    email: 'brianjosephdias@gmail.com',
    passwordEnv: 'SEED_ADMIN_BRIAN_PASSWORD',
  },
];

const seedAdmins = async () => {
  try {
    await connectDatabase();
    console.log('✅ Connected to MongoDB');

    for (const admin of adminSeeds) {
      const password = process.env[admin.passwordEnv];

      if (!password) {
        console.error(`❌ Missing environment variable: ${admin.passwordEnv}`);
        console.error(`   Please set ${admin.passwordEnv} in your .env file`);
        continue;
      }

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
          existing.password = password;
        }
        await existing.save();

        logger.info(`Updated admin user: ${admin.email}`);
        console.log(`🔄 Updated admin: ${admin.email}`);
      } else {
        await User.create({
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email.toLowerCase(),
          password: password,
          role: UserRole.ADMIN,
          isVerified: true,
          isActive: true,
        });

        logger.info(`Created admin user: ${admin.email}`);
        console.log(`✅ Created admin: ${admin.email}`);
      }

      // Log email only (password is not logged for security)
      console.log(`   Email: ${admin.email}`);
      console.log('   Role: ADMIN\n');
    }

    console.log(
      '✅ Admin seeding complete. Please change these passwords after first login.'
    );
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
