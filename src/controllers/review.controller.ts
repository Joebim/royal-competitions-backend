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

/**
 * Create review (Admin)
 * POST /api/v1/admin/reviews
 */
export const createReviewForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, body, rating, reviewer, location, verified, isActive } =
      req.body;

    if (!title || !body || !rating || !reviewer) {
      throw new ApiError('Missing required fields: title, body, rating, reviewer', 422);
    }

    const review = await Review.create({
      title,
      body,
      rating,
      reviewer,
      location,
      verified: verified !== undefined ? verified : false,
      isActive: isActive !== undefined ? isActive : true,
      publishedAt: new Date(),
    });

    res.status(201).json(
      ApiResponse.success({ review }, 'Review created successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all reviews for admin (includes inactive reviews)
 * GET /api/v1/admin/reviews
 */
export const getAllReviewsForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    const filters: Record<string, any> = {};

    // Filter by verification status
    if (req.query.verified !== undefined) {
      filters.verified = req.query.verified === 'true';
    }

    // Filter by active status - by default, only show active reviews
    // If explicitly requested, show all or only inactive
    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === 'true';
    } else {
      // Default: only show active reviews (exclude soft-deleted ones)
      filters.isActive = true;
    }

    // Search by title, body, or reviewer name
    if (req.query.search) {
      filters.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { body: { $regex: req.query.search, $options: 'i' } },
        { reviewer: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [reviews, total] = await Promise.all([
      Review.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
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

/**
 * Get single review by ID (Admin)
 * GET /api/v1/admin/reviews/:id
 */
export const getReviewByIdForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const review = await Review.findById(req.params.id).lean();

    if (!review) {
      throw new ApiError('Review not found', 404);
    }

    res.json(
      ApiResponse.success({ review }, 'Review retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update review (Admin)
 * PUT /api/v1/admin/reviews/:id
 */
export const updateReviewForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, body, rating, reviewer, location, verified, isActive } =
      req.body;

    const review = await Review.findById(req.params.id);

    if (!review) {
      throw new ApiError('Review not found', 404);
    }

    if (title !== undefined) review.title = title;
    if (body !== undefined) review.body = body;
    if (rating !== undefined) review.rating = rating;
    if (reviewer !== undefined) review.reviewer = reviewer;
    if (location !== undefined) review.location = location;
    if (verified !== undefined) review.verified = verified;
    if (isActive !== undefined) review.isActive = isActive;

    await review.save();

    res.json(
      ApiResponse.success({ review }, 'Review updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete review (Admin) - Soft delete
 * DELETE /api/v1/admin/reviews/:id
 */
export const deleteReviewForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      throw new ApiError('Review not found', 404);
    }

    // Soft delete
    review.isActive = false;
    await review.save();

    res.json(ApiResponse.success(null, 'Review deleted successfully'));
  } catch (error) {
    next(error);
  }
};

