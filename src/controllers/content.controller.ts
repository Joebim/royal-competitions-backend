import { Request, Response, NextFunction } from 'express';
import {
  Champion,
  Competition,
  Draw,
  Review,
  SiteStat,
} from '../models';
import { CompetitionStatus } from '../models/Competition.model';
import { ApiResponse } from '../utils/apiResponse';

const CACHE_TTL_MS = 5 * 60 * 1000;

let homeCache: {
  data: any | null;
  expiresAt: number;
} = {
  data: null,
  expiresAt: 0,
};

const formatNumber = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M+`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K+`;
  }
  return `${value}`;
};

const calculateProgress = (soldTickets: number, maxTickets: number) => {
  const percentage =
    maxTickets > 0 ? Math.round((soldTickets / maxTickets) * 100) : 0;

  return {
    soldTickets,
    maxTickets,
    entriesRemaining: Math.max(maxTickets - soldTickets, 0),
    percentage: Math.min(percentage, 100),
  };
};

const formatCompetitionCard = (competition: any) => ({
  id: competition._id,
  title: competition.title,
  slug: competition.slug,
  image: competition.images?.[0]?.url || null,
  ticketPrice: competition.ticketPrice,
  maxTickets: competition.maxTickets,
  soldTickets: competition.soldTickets,
  progress: calculateProgress(competition.soldTickets, competition.maxTickets),
  drawDate: competition.drawDate,
  category: competition.category,
  featured: competition.featured,
});

const formatChampionCard = (champion: any) => ({
  id: champion._id,
  winnerName: champion.winnerName,
  winnerLocation: champion.winnerLocation,
  prizeName: champion.prizeName,
  prizeValue: champion.prizeValue,
  testimonial: champion.testimonial,
  image: champion.image?.url || null,
  featured: champion.featured,
});

const formatDrawCard = (draw: any) => ({
  id: draw._id,
  winner: draw.winnerName,
  location: draw.winnerLocation,
  prize: draw.prizeName,
  prizeValue: draw.prizeValue,
  ticketNumber: draw.winningTicketNumber,
  drawDate: draw.drawDate,
  image: draw.imageUrl || null,
});

const formatReviewCard = (review: any) => ({
  id: review._id,
  title: review.title,
  body: review.body,
  rating: review.rating,
  reviewer: review.reviewer,
  location: review.location,
  timeAgo: review.timeAgo,
  verified: review.verified,
});

const loadStats = async () => {
  const stats = await SiteStat.find().lean();

  if (stats.length > 0) {
    return stats.map((stat) => ({
      key: stat.key,
      label: stat.label || stat.key,
      value: formatNumber(stat.value),
      description: stat.description,
    }));
  }

  const [totalCompetitions, totalDraws, totalChampions] = await Promise.all([
    Competition.countDocuments({ status: CompetitionStatus.COMPLETED }),
    Draw.countDocuments({ isActive: true }),
    Champion.countDocuments({ isActive: true }),
  ]);

  return [
    {
      key: 'competitions',
      label: 'Competitions',
      value: formatNumber(totalCompetitions),
    },
    {
      key: 'draws',
      label: 'Winners',
      value: formatNumber(totalDraws),
    },
    {
      key: 'champions',
      label: 'Champions',
      value: formatNumber(totalChampions),
    },
  ];
};

export const getHomeContent = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (homeCache.data && Date.now() < homeCache.expiresAt) {
      res.json(ApiResponse.success(homeCache.data, 'Home content retrieved'));
      return;
    }

    const [
      featuredCompetitions,
      competitions,
      champions,
      draws,
      reviews,
      stats,
    ] = await Promise.all([
      Competition.find({
        featured: true,
        isActive: true,
        status: CompetitionStatus.ACTIVE,
      })
        .sort({ createdAt: -1 })
        .limit(1)
        .lean(),
      Competition.find({
        isActive: true,
        status: CompetitionStatus.ACTIVE,
      })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      Champion.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      Draw.find({ isActive: true })
        .sort({ drawDate: -1 })
        .limit(6)
        .lean(),
      Review.find({ isActive: true })
        .sort({ publishedAt: -1 })
        .limit(6)
        .lean(),
      loadStats(),
    ]);

    const heroCompetition = featuredCompetitions[0] || competitions[0];
    const hero = heroCompetition
      ? {
          image: heroCompetition.images?.[0]?.url || null,
          alt: heroCompetition.title,
        }
      : null;

    const data = {
      hero,
      competitions: competitions.map(formatCompetitionCard),
      champions: champions.map(formatChampionCard),
      stats,
      recentDraws: draws.map(formatDrawCard),
      reviews: reviews.map(formatReviewCard),
    };

    homeCache = {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    res.json(ApiResponse.success(data, 'Home content retrieved'));
  } catch (error) {
    next(error);
  }
};

export const getPageContent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { slug } = req.params;

    res.json(
      ApiResponse.success(
        {
          slug,
          title: slug.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
          body: null,
        },
        'Page content not configured'
      )
    );
  } catch (error) {
    next(error);
  }
};

