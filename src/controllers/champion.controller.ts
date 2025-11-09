import { Request, Response, NextFunction } from 'express';
import { Champion, Draw } from '../models';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { getPagination } from '../utils/pagination';
import cloudinaryService from '../services/cloudinary.service';

/**
 * @swagger
 * /api/v1/champions:
 *   get:
 *     summary: Get all champions
 *     tags: [Champions]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Champions retrieved successfully
 */
export const getChampions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = 1,
      limit = 12,
      featured,
      search,
      includeInactive,
    } = req.query;

    // Build query
    const query: any = {};

    const includeInactiveFlag =
      ['true', '1'].includes(String(includeInactive).toLowerCase()) ||
      (req.user &&
        (req.user.role === 'admin' || req.user.role === 'super_admin'));

    if (!includeInactiveFlag) {
      query.isActive = true;
    }

    if (featured === 'true') query.featured = true;
    if (search) {
      query.$or = [
        { winnerName: { $regex: search, $options: 'i' } },
        { prizeName: { $regex: search, $options: 'i' } },
        { winnerLocation: { $regex: search, $options: 'i' } },
      ];
    }

    // Get pagination
    const { skip, limit: pageLimit } = getPagination(
      Number(page),
      Number(limit)
    );

    // Get champions
    const champions = await Champion.find(query)
      .populate('competitionId', 'title category')
      .populate('drawId', 'drawDate drawnAt')
      .populate('winnerId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    const total = await Champion.countDocuments(query);

    res.json(
      ApiResponse.success(
        {
          champions,
          total,
          page: Number(page),
          pages: Math.ceil(total / pageLimit),
        },
        'Champions retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/champions/{id}:
 *   get:
 *     summary: Get single champion by ID
 *     tags: [Champions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Champion retrieved successfully
 *       404:
 *         description: Champion not found
 */
export const getChampion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const champion = await Champion.findById(req.params.id)
      .populate('competitionId')
      .populate('drawId')
      .populate('winnerId', 'firstName lastName email phone');

    if (!champion) {
      throw new ApiError('Champion not found', 404);
    }

    res.json(
      ApiResponse.success({ champion }, 'Champion retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/champions:
 *   post:
 *     summary: Create a new champion (Admin only)
 *     tags: [Champions]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - drawId
 *               - testimonial
 *               - image
 *             properties:
 *               drawId:
 *                 type: string
 *               winnerName:
 *                 type: string
 *               winnerLocation:
 *                 type: string
 *               testimonial:
 *                 type: string
 *               prizeValue:
 *                 type: string
 *               featured:
 *                 type: boolean
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Champion created successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Draw not found
 */
export const createChampion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { drawId, winnerName, winnerLocation, testimonial, featured } =
      req.body;

    // Verify draw exists
    const draw = await Draw.findById(drawId);
    if (!draw) {
      throw new ApiError('Draw not found', 404);
    }

    // Upload image if provided
    let imageData = null;
    if (req.file) {
      const uploadedImage = await cloudinaryService.uploadImageFromBuffer(
        req.file
      );
      imageData = {
        url: uploadedImage.url,
        publicId: uploadedImage.publicId,
      };
    } else if (draw.imageUrl) {
      // Use draw image if no new image provided
      imageData = {
        url: draw.imageUrl,
        publicId: draw.publicId || '',
      };
    } else {
      throw new ApiError('Image is required', 400);
    }

    const championData = {
      drawId,
      competitionId: draw.competitionId,
      winnerId: draw.winnerId,
      winnerName: winnerName || draw.winnerName,
      winnerLocation: winnerLocation || draw.winnerLocation,
      prizeName: draw.prizeName,
      prizeValue: req.body.prizeValue || draw.prizeValue,
      testimonial,
      image: imageData,
      featured: featured || false,
    };

    const champion = await Champion.create(championData);

    res
      .status(201)
      .json(ApiResponse.success({ champion }, 'Champion created successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/champions/{id}:
 *   put:
 *     summary: Update a champion (Admin only)
 *     tags: [Champions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Champion updated successfully
 *       404:
 *         description: Champion not found
 */
export const updateChampion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const champion = await Champion.findById(req.params.id);

    if (!champion) {
      throw new ApiError('Champion not found', 404);
    }

    // Handle image update
    if (req.file) {
      // Delete old image from Cloudinary
      if (champion.image.publicId) {
        await cloudinaryService.deleteImage(champion.image.publicId);
      }

      // Upload new image
      const uploadedImage = await cloudinaryService.uploadImageFromBuffer(
        req.file
      );
      req.body.image = {
        url: uploadedImage.url,
        publicId: uploadedImage.publicId,
      };
    }

    const updatedChampion = await Champion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('competitionId')
      .populate('drawId')
      .populate('winnerId');

    res.json(
      ApiResponse.success(
        { champion: updatedChampion },
        'Champion updated successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/champions/{id}:
 *   delete:
 *     summary: Delete a champion (Admin only)
 *     tags: [Champions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Champion deleted successfully
 *       404:
 *         description: Champion not found
 */
export const deleteChampion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const champion = await Champion.findById(req.params.id);

    if (!champion) {
      throw new ApiError('Champion not found', 404);
    }

    // Delete image from Cloudinary
    if (champion.image.publicId) {
      await cloudinaryService.deleteImage(champion.image.publicId);
    }

    // Soft delete
    champion.isActive = false;
    await champion.save();

    res.json(ApiResponse.success(null, 'Champion deleted successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/champions/featured:
 *   get:
 *     summary: Get featured champions
 *     tags: [Champions]
 *     responses:
 *       200:
 *         description: Featured champions retrieved successfully
 */
export const getFeaturedChampions = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const champions = await Champion.find({
      featured: true,
      isActive: true,
    })
      .populate('competitionId', 'title category')
      .sort({ createdAt: -1 })
      .limit(12);

    res.json(
      ApiResponse.success({ champions }, 'Featured champions retrieved')
    );
  } catch (error) {
    next(error);
  }
};
