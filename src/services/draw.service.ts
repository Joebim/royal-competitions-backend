import crypto from 'crypto';
import mongoose from 'mongoose';
import { Ticket, Competition, Draw } from '../models';
import { IDrawResult } from '../models/Draw.model';
import logger from '../utils/logger';

interface TicketSnapshot {
  ticketNumber: number;
  ticketId: string;
  userId?: string;
}

interface DrawOptions {
  competitionId: string;
  numWinners?: number; // Default 1, can have reserves
  seed?: string; // Optional seed for reproducibility
}

/**
 * Service for handling draw operations
 */
class DrawService {
  /**
   * Generate a cryptographically secure random seed
   */
  generateSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a snapshot of all active tickets for a competition
   */
  async createTicketSnapshot(competitionId: string): Promise<TicketSnapshot[]> {
    const tickets = await Ticket.find({
      competitionId,
      status: 'active', // Only active tickets are eligible
    })
      .sort({ ticketNumber: 1 }) // Sort by ticket number for consistency
      .select('ticketNumber _id userId')
      .lean();

    return tickets.map((ticket: any) => ({
      ticketNumber: ticket.ticketNumber,
      ticketId: ticket._id.toString(),
      userId: ticket.userId?.toString(),
    }));
  }

  /**
   * Pick winners using HMAC-SHA256 deterministic algorithm
   */
  pickWinners(
    seed: string,
    ticketList: TicketSnapshot[],
    numWinners: number = 1
  ): TicketSnapshot[] {
    if (ticketList.length === 0) {
      throw new Error('No tickets available for draw');
    }

    if (numWinners > ticketList.length) {
      throw new Error(
        `Cannot pick ${numWinners} winners from ${ticketList.length} tickets`
      );
    }

    const winners: TicketSnapshot[] = [];
    const usedIndices = new Set<number>();
    let attempts = 0;
    const maxAttempts = numWinners * 100; // Prevent infinite loop

    while (winners.length < numWinners && attempts < maxAttempts) {
      attempts++;

      // Create HMAC for this pick attempt
      const hmac = crypto.createHmac('sha256', Buffer.from(seed, 'hex'));
      hmac.update(`pick-${winners.length}-${attempts}`);
      const digest = hmac.digest('hex');

      // Convert hex to BigInt for modulo operation
      const bigInt = BigInt('0x' + digest);
      const index = Number(bigInt % BigInt(ticketList.length));

      // If index not used and ticket not already selected, add it
      if (!usedIndices.has(index)) {
        const ticket = ticketList[index];
        // Check if this ticket is already in winners
        if (!winners.some((w) => w.ticketNumber === ticket.ticketNumber)) {
          winners.push(ticket);
          usedIndices.add(index);
        }
      }
    }

    if (winners.length < numWinners) {
      logger.warn(
        `Only found ${winners.length} unique winners out of ${numWinners} requested`
      );
    }

    return winners;
  }

  /**
   * Run a draw for a competition
   * Returns results and snapshot
   */
  async runDraw(options: DrawOptions): Promise<{
    results: IDrawResult[];
    snapshot: TicketSnapshot[];
    seed: string;
  }> {
    const { competitionId, numWinners = 1, seed } = options;

    // Get competition
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new Error('Competition not found');
    }

    // Check if competition is closed or already drawn
    if (competition.status === 'drawn') {
      throw new Error('Competition has already been drawn');
    }

    // Create snapshot of tickets
    const snapshot = await this.createTicketSnapshot(competitionId);
    if (snapshot.length === 0) {
      throw new Error('No active tickets found for draw');
    }

    // Generate seed if not provided
    const drawSeed = seed || this.generateSeed();

    // Pick winners
    const winners = this.pickWinners(drawSeed, snapshot, numWinners);

    // Convert to draw results format
    const results: IDrawResult[] = winners.map((winner: TicketSnapshot) => ({
      ticketNumber: winner.ticketNumber,
      ticketId: new mongoose.Types.ObjectId(winner.ticketId),
      userId: winner.userId
        ? new mongoose.Types.ObjectId(winner.userId)
        : undefined,
    }));

    return {
      results,
      snapshot,
      seed: drawSeed,
    };
  }

  /**
   * Create draw record with snapshot
   */
  async createDrawRecord(
    competitionId: string,
    seed: string,
    results: IDrawResult[],
    snapshot: TicketSnapshot[],
    drawMethod: 'automatic' | 'admin_triggered' | 'manual',
    initiatedBy?: string,
    notes?: string,
    evidenceUrl?: string,
    liveUrl?: string,
    urlType?: string
  ): Promise<any> {
    // Create draw record with provided snapshot
    const draw = await Draw.create({
      competitionId,
      drawTime: new Date(),
      seed,
      algorithm: 'hmac-sha256-v1',
      snapshotTicketCount: snapshot.length,
      snapshot: snapshot, // Store snapshot in DB
      result: results,
      drawMethod,
      initiatedBy: initiatedBy as any,
      notes,
      evidenceUrl,
      liveUrl,
      urlType,
    });

    return draw;
  }

  /**
   * Verify draw result (for audit purposes)
   */
  async verifyDraw(drawId: string): Promise<boolean> {
    const draw = await Draw.findById(drawId);
    if (!draw) {
      throw new Error('Draw not found');
    }

    if (!draw.snapshot || !Array.isArray(draw.snapshot)) {
      throw new Error('Draw snapshot not available');
    }

    // Re-run draw with same seed and snapshot
    const winners = this.pickWinners(
      draw.seed,
      draw.snapshot as TicketSnapshot[],
      draw.result.length
    );

    // Verify results match
    const originalTicketNumbers = draw.result
      .map((r: IDrawResult) => r.ticketNumber)
      .sort((a: number, b: number) => a - b);
    const verifiedTicketNumbers = winners
      .map((w: TicketSnapshot) => w.ticketNumber)
      .sort((a: number, b: number) => a - b);

    return (
      originalTicketNumbers.length === verifiedTicketNumbers.length &&
      originalTicketNumbers.every(
        (num: number, idx: number) => num === verifiedTicketNumbers[idx]
      )
    );
  }
}

const drawService = new DrawService();
export default drawService;
