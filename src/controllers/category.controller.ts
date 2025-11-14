import { Request, Response, NextFunction } from 'express';
import { Category } from '../models';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { getPagination } from '../utils/pagination';
import mongoose from 'mongoose';

/**
 * @desc    Get all active categories (Public)
 * @route   GET /api/v1/categories
 * @access  Public
 */
export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { includeInactive } = req.query;
    
    const filter: any = {};
    if (includeInactive !== 'true') {
      filter.isActive = true;
    }

    const categories = await Category.find(filter)
      .sort({ name: 1 })
      .select('-__v')
      .lean();

    res.json(
      ApiResponse.success(
        { categories },
        'Categories retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single category by slug (Public)
 * @route   GET /api/v1/categories/:slug
 * @access  Public
 */
export const getCategoryBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({ slug: slug.toLowerCase() }).lean();

    if (!category) {
      throw new ApiError('Category not found', 404, true, {
        slug: ['Category not found'],
      });
    }

    res.json(
      ApiResponse.success({ category }, 'Category retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new category (User/Public - for users to add their own)
 * @route   POST /api/v1/categories
 * @access  Public (but can be protected if needed)
 */
export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      throw new ApiError('Category name is required', 400, true, {
        name: ['Category name is required'],
      });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
        { slug: name.trim().toLowerCase().replace(/\s+/g, '-') },
      ],
    });

    if (existingCategory) {
      throw new ApiError(
        'Category with this name already exists',
        409,
        true,
        {
          name: ['Category with this name already exists'],
        }
      );
    }

    const category = await Category.create({
      name: name.trim(),
      isUserCreated: true,
      createdBy: req.user?._id as mongoose.Types.ObjectId | undefined,
      isActive: true, // Auto-approve user-created categories
    });

    res.status(201).json(
      ApiResponse.success({ category }, 'Category created successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all categories (Admin)
 * @route   GET /api/v1/admin/categories
 * @access  Private/Admin
 */
export const getAllCategoriesForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    const filters: Record<string, any> = {};

    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === 'true';
    }

    if (req.query.isUserCreated !== undefined) {
      filters.isUserCreated = req.query.isUserCreated === 'true';
    }

    if (req.query.search) {
      filters.name = { $regex: req.query.search, $options: 'i' };
    }

    const [categories, total] = await Promise.all([
      Category.find(filters)
        .populate('createdBy', 'firstName lastName email')
        .sort({ usageCount: -1, name: 1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Category.countDocuments(filters),
    ]);

    res.json(
      ApiResponse.success(
        {
          categories,
          pagination: {
            page,
            limit: pageLimit,
            total,
            totalPages: Math.ceil(total / pageLimit),
            hasNext: page < Math.ceil(total / pageLimit),
            hasPrev: page > 1,
          },
        },
        'Categories retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single category by ID (Admin)
 * @route   GET /api/v1/admin/categories/:id
 * @access  Private/Admin
 */
export const getCategoryByIdForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id)
      .populate('createdBy', 'firstName lastName email')
      .lean();

    if (!category) {
      throw new ApiError('Category not found', 404, true, {
        id: ['Category not found'],
      });
    }

    res.json(
      ApiResponse.success({ category }, 'Category retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new category (Admin)
 * @route   POST /api/v1/admin/categories
 * @access  Private/Admin
 */
export const createCategoryForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, isActive } = req.body;

    if (!name || !name.trim()) {
      throw new ApiError('Category name is required', 400, true, {
        name: ['Category name is required'],
      });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
        { slug: name.trim().toLowerCase().replace(/\s+/g, '-') },
      ],
    });

    if (existingCategory) {
      throw new ApiError(
        'Category with this name already exists',
        409,
        true,
        {
          name: ['Category with this name already exists'],
        }
      );
    }

    const category = await Category.create({
      name: name.trim(),
      isUserCreated: false,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user?._id as mongoose.Types.ObjectId | undefined,
    });

    res.status(201).json(
      ApiResponse.success({ category }, 'Category created successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update category (Admin)
 * @route   PUT /api/v1/admin/categories/:id
 * @access  Private/Admin
 */
export const updateCategoryForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      throw new ApiError('Category not found', 404, true, {
        id: ['Category not found'],
      });
    }

    // Check for duplicate name if name is being updated
    if (name && name.trim() !== category.name) {
      const existingCategory = await Category.findOne({
        _id: { $ne: id },
        $or: [
          { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
          { slug: name.trim().toLowerCase().replace(/\s+/g, '-') },
        ],
      });

      if (existingCategory) {
        throw new ApiError(
          'Category with this name already exists',
          409,
          true,
          {
            name: ['Category with this name already exists'],
          }
        );
      }

      category.name = name.trim();
      // Slug will be auto-generated in pre-save hook
    }

    if (isActive !== undefined) {
      category.isActive = isActive;
    }

    await category.save();

    res.json(
      ApiResponse.success({ category }, 'Category updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete category (Admin - soft delete)
 * @route   DELETE /api/v1/admin/categories/:id
 * @access  Private/Admin
 */
export const deleteCategoryForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      throw new ApiError('Category not found', 404, true, {
        id: ['Category not found'],
      });
    }

    // Check if category is being used
    const { Competition } = await import('../models');
    const competitionsUsingCategory = await Competition.countDocuments({
      category: category.name,
    });

    if (competitionsUsingCategory > 0) {
      throw new ApiError(
        `Cannot delete category. It is being used by ${competitionsUsingCategory} competition(s). Deactivate it instead.`,
        400,
        true,
        {
          category: [
            `Category is in use by ${competitionsUsingCategory} competition(s)`,
          ],
        }
      );
    }

    // Soft delete by setting isActive to false
    category.isActive = false;
    await category.save();

    res.json(
      ApiResponse.success(null, 'Category deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};

