import mongoose from 'mongoose';
import logger from './logger';

/**
 * Check if MongoDB instance supports transactions
 * Transactions require a replica set or sharded cluster
 */
export async function supportsTransactions(): Promise<boolean> {
  try {
    const admin = mongoose.connection.db?.admin();
    if (!admin) {
      return false;
    }

    const serverStatus = await admin.serverStatus();
    // Replica sets have 'repl' field, standalone instances don't
    // Sharded clusters will have replica sets
    return !!serverStatus.repl;
  } catch (error) {
    logger.warn('Could not check MongoDB transaction support:', error);
    return false;
  }
}

/**
 * Execute a function with transaction support if available, otherwise without
 * @param callback Function to execute with session
 * @param fallback Fallback function to execute if transactions are not supported
 */
export async function withTransaction<T>(
  callback: (session: mongoose.ClientSession) => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  const hasTransactions = await supportsTransactions();

  if (hasTransactions) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } else {
    // Execute without transaction
    if (fallback) {
      return await fallback();
    } else {
      // Create a dummy session object that doesn't actually use transactions
      // This allows the callback to work, but operations won't be in a transaction
      const dummySession = {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        endSession: () => {},
      } as unknown as mongoose.ClientSession;
      
      logger.warn('Transactions not supported, executing without transaction');
      return await callback(dummySession);
    }
  }
}

