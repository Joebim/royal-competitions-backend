import { Request, Response, NextFunction } from 'express';
import { Review } from '../models';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { getPagination } from '../utils/pagination';

const buildPaginationMeta = (page: number, limit: number, total: number) => ({
  pagination: {
    page,
    limit,
    totalItems: total,
    totalPages: Math.ceil(total / limit) || 1,
  },
});

export const getReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    const filters: Record<string, any> = { isActive: true };
    if (req.query.verified) {
      filters.verified = req.query.verified === 'true';
    }

    const [reviews, total] = await Promise.all([
      Review.find(filters).sort({ publishedAt: -1 }).skip(skip).limit(pageLimit),
      Review.countDocuments(filters),
    ]);

    res.json(
      ApiResponse.success(
        { reviews },
        'Reviews retrieved successfully',
        buildPaginationMeta(page, pageLimit, total)
      )
    );
  } catch (error) {
    next(error);
  }
};

export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, body, rating, reviewer, location } = req.body;

    if (!title || !body || !rating || !reviewer) {
      throw new ApiError('Missing required fields', 422);
    }

    const review = await Review.create({
      title,
      body,
      rating,
      reviewer,
      location,
      publishedAt: new Date(),
      verified: false,
    });

    res.status(201).json(
      ApiResponse.success({ review }, 'Review submitted successfully')
    );
  } catch (error) {
    next(error);
  }
};

