import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import cloudinaryService from '../services/cloudinary.service';

/**
 * @desc    Upload single image
 * @route   POST /api/v1/upload/image
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
 * @route   POST /api/v1/upload/images
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
 * @route   DELETE /api/v1/upload/image/:publicId
 * @access  Private/Admin
 */
export const deleteImage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { publicId } = req.params;

    await cloudinaryService.deleteImage(publicId);

    res.json(ApiResponse.success(null, 'Image deleted successfully'));
  } catch (error) {
    next(error);
  }
};




