import { Request, Response, NextFunction } from 'express';
import {
  Competition,
  Draw,
  Champion,
  SiteStat,
} from '../models';
import { CompetitionStatus } from '../models/Competition.model';
import { ApiResponse } from '../utils/apiResponse';

const formatNumber = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M+`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K+`;
  }
  return `${value}`;
};

export const getSiteStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const stats = await SiteStat.find().lean();

    if (stats.length > 0) {
      res.json(
        ApiResponse.success(
          {
            stats: stats.map((stat) => ({
              key: stat.key,
              label: stat.label || stat.key,
              value: stat.value,
              formattedValue: formatNumber(stat.value),
              description: stat.description,
              updatedAt: stat.updatedAt,
            })),
          },
          'Site stats retrieved'
        )
      );
      return;
    }

    const [competitions, draws, champions] = await Promise.all([
      Competition.countDocuments({ status: CompetitionStatus.COMPLETED }),
      Draw.countDocuments({ isActive: true }),
      Champion.countDocuments({ isActive: true }),
    ]);

    res.json(
      ApiResponse.success(
        {
          stats: [
            {
              key: 'competitions',
              label: 'Competitions',
              value: competitions,
              formattedValue: formatNumber(competitions),
            },
            {
              key: 'draws',
              label: 'Draws',
              value: draws,
              formattedValue: formatNumber(draws),
            },
            {
              key: 'champions',
              label: 'Champions',
              value: champions,
              formattedValue: formatNumber(champions),
            },
          ],
        },
        'Site stats retrieved'
      )
    );
  } catch (error) {
    next(error);
  }
};

