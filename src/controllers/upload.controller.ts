import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import cloudinaryService from '../services/cloudinary.service';

/**
 * @desc    Upload single image
 * @route   POST /api/v1/admin/upload/image
 * @access  Private/Admin
 */
export const uploadImage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      throw new ApiError('Please upload an image', 400);
    }

    const result = await cloudinaryService.uploadImageFromBuffer(req.file);

    res.json(ApiResponse.success({ image: result }, 'Image uploaded successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload multiple images
 * @route   POST /api/v1/admin/upload/images
 * @access  Private/Admin
 */
export const uploadMultipleImages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new ApiError('Please upload at least one image', 400);
    }

    const results = await cloudinaryService.uploadMultipleImages(
      req.files as Express.Multer.File[]
    );

    res.json(ApiResponse.success({ images: results }, 'Images uploaded successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete image
 * @route   DELETE /api/v1/admin/upload/image/*
 * @access  Private/Admin
 * @note    Uses catch-all route to handle publicId with slashes (e.g., "royal-competitions/image123")
 */
export const deleteImage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // For catch-all routes (*), the path is in req.params[0]
    // For parameter routes (:publicId), it's in req.params.publicId
    let publicId: string = '';
    
    if (req.params[0]) {
      // Catch-all route pattern - path is in req.params[0]
      publicId = req.params[0];
    } else if (req.params.publicId) {
      // Named parameter route
      publicId = req.params.publicId;
    }

    if (!publicId) {
      throw new ApiError('Public ID is required', 400);
    }

    // Remove leading slash if present
    publicId = publicId.replace(/^\//, '');

    // Decode the publicId in case it's URL encoded
    const decodedPublicId = decodeURIComponent(publicId);

    await cloudinaryService.deleteImage(decodedPublicId);

    res.json(ApiResponse.success(null, 'Image deleted successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all uploads from Cloudinary
 * @route   GET /api/v1/admin/upload/list
 * @access  Private/Admin
 */
export const getAllUploads = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      folder,
      resourceType = 'image',
      maxResults = 50,
      nextCursor,
    } = req.query;

    const result = await cloudinaryService.getAllResources({
      folder: folder as string | undefined,
      resourceType: resourceType as 'image' | 'video' | 'raw' | undefined,
      maxResults: maxResults ? parseInt(maxResults as string, 10) : 50,
      nextCursor: nextCursor as string | undefined,
    });

    res.json(
      ApiResponse.success(
        {
          uploads: result.resources,
          pagination: {
            nextCursor: result.nextCursor,
            totalCount: result.totalCount,
            hasMore: !!result.nextCursor,
          },
        },
        'Uploads retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};




