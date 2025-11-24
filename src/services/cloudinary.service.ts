import { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import cloudinary from '../config/cloudinary';
import { config } from '../config/environment';
import logger from '../utils/logger';
import { ApiError } from '../utils/apiError';

interface UploadResult {
  url: string;
  publicId: string;
  thumbnail?: string;
}

class CloudinaryService {
  private createUploadStream(
    resolve: (value: UploadResult | PromiseLike<UploadResult>) => void,
    reject: (reason?: ApiError) => void,
    folder: string,
    resourceType: 'auto' | 'video' = 'auto'
  ) {
    return cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        transformation:
          resourceType === 'auto'
            ? [
                { quality: 'auto', fetch_format: 'auto' },
                { width: 1200, height: 1200, crop: 'limit' },
              ]
            : undefined,
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          logger.error('Cloudinary upload stream error:', error);
          reject(new ApiError('Failed to upload image', 500));
          return;
        }

        const uploadResult: UploadResult = {
          url: result.secure_url,
          publicId: result.public_id,
        };

        if (resourceType === 'auto') {
          uploadResult.thumbnail = cloudinary.url(result.public_id, {
            width: 400,
            height: 400,
            crop: 'fill',
            quality: 'auto',
            fetch_format: 'auto',
          });
        }

        resolve(uploadResult);
      }
    );
  }

  async uploadImageFromBuffer(
    file: Express.Multer.File,
    folder: string = config.cloudinary.folder
  ): Promise<UploadResult> {
    try {
      return await new Promise<UploadResult>((resolve, reject) => {
        const stream = this.createUploadStream(resolve, reject, folder, 'auto');
        stream.end(file.buffer);
      });
    } catch (error) {
      logger.error('Cloudinary upload buffer error:', error);
      throw new ApiError('Failed to upload image', 500);
    }
  }

  async uploadMultipleImagesFromBuffers(
    files: Express.Multer.File[],
    folder: string = config.cloudinary.folder
  ): Promise<UploadResult[]> {
    try {
      return await Promise.all(
        files.map((file) => this.uploadImageFromBuffer(file, folder))
      );
    } catch (error) {
      logger.error('Cloudinary multiple buffer upload error:', error);
      throw new ApiError('Failed to upload images', 500);
    }
  }
  /**
   * Upload single image to Cloudinary
   */
  async uploadImage(
    filePath: string,
    folder: string = config.cloudinary.folder
  ): Promise<UploadResult> {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'auto',
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
          { width: 1200, height: 1200, crop: 'limit' },
        ],
      });

      // Generate thumbnail
      const thumbnail = cloudinary.url(result.public_id, {
        width: 400,
        height: 400,
        crop: 'fill',
        quality: 'auto',
        fetch_format: 'auto',
      });

      logger.info(`Image uploaded to Cloudinary: ${result.public_id}`);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        thumbnail,
      };
    } catch (error) {
      logger.error('Cloudinary upload error:', error);
      throw new ApiError('Failed to upload image', 500);
    }
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(
    files: Array<string | Express.Multer.File>,
    folder: string = config.cloudinary.folder
  ): Promise<UploadResult[]> {
    try {
      const uploadPromises = files.map((file) =>
        typeof file === 'string'
          ? this.uploadImage(file, folder)
          : this.uploadImageFromBuffer(file, folder)
      );

      return await Promise.all(uploadPromises);
    } catch (error) {
      logger.error('Multiple images upload error:', error);
      throw new ApiError('Failed to upload images', 500);
    }
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      logger.info(`Image deleted from Cloudinary: ${publicId}`);
    } catch (error) {
      logger.error('Cloudinary delete error:', error);
      throw new ApiError('Failed to delete image', 500);
    }
  }

  /**
   * Delete multiple images
   */
  async deleteMultipleImages(publicIds: string[]): Promise<void> {
    try {
      const deletePromises = publicIds.map((publicId) =>
        this.deleteImage(publicId)
      );
      await Promise.all(deletePromises);
    } catch (error) {
      logger.error('Multiple images delete error:', error);
      throw new ApiError('Failed to delete images', 500);
    }
  }

  /**
   * Upload video to Cloudinary
   */
  async uploadVideo(
    filePath: string,
    folder: string = config.cloudinary.folder
  ): Promise<UploadResult> {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'video',
        transformation: [{ quality: 'auto' }],
      });

      logger.info(`Video uploaded to Cloudinary: ${result.public_id}`);

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      logger.error('Cloudinary video upload error:', error);
      throw new ApiError('Failed to upload video', 500);
    }
  }

  /**
   * Get optimized image URL
   */
  getOptimizedUrl(
    publicId: string,
    options?: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string;
    }
  ): string {
    return cloudinary.url(publicId, {
      width: options?.width || 800,
      height: options?.height,
      crop: options?.crop || 'fill',
      quality: options?.quality || 'auto',
      fetch_format: 'auto',
    });
  }

  /**
   * Get all resources in a folder
   */
  async getFolderResources(folder: string = config.cloudinary.folder) {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: folder,
        max_results: 500,
      });
      return result.resources;
    } catch (error) {
      logger.error('Error fetching folder resources:', error);
      throw new ApiError('Failed to fetch resources', 500);
    }
  }

  /**
   * Get all resources from Cloudinary with pagination
   * @param options - Pagination and filtering options
   * @returns Array of resources with metadata
   */
  async getAllResources(options?: {
    folder?: string;
    resourceType?: 'image' | 'video' | 'raw';
    maxResults?: number;
    nextCursor?: string;
  }) {
    try {
      const {
        folder = config.cloudinary.folder,
        resourceType = 'image',
        maxResults = 50,
        nextCursor,
      } = options || {};

      const params: any = {
        type: 'upload',
        resource_type: resourceType,
        max_results: maxResults,
      };

      if (folder) {
        params.prefix = folder;
      }

      if (nextCursor) {
        params.next_cursor = nextCursor;
      }

      const result = await cloudinary.api.resources(params);

      // Format resources for frontend
      const resources = result.resources.map((resource: any) => ({
        publicId: resource.public_id,
        url: resource.secure_url,
        format: resource.format,
        width: resource.width,
        height: resource.height,
        bytes: resource.bytes,
        createdAt: resource.created_at,
        folder: resource.folder,
        resourceType: resource.resource_type,
        // Generate thumbnail for images
        thumbnail:
          resource.resource_type === 'image'
            ? cloudinary.url(resource.public_id, {
                width: 400,
                height: 400,
                crop: 'fill',
                quality: 'auto',
                fetch_format: 'auto',
              })
            : undefined,
      }));

      return {
        resources,
        nextCursor: result.next_cursor || null,
        totalCount: result.total_count || resources.length,
      };
    } catch (error) {
      logger.error('Error fetching all resources:', error);
      throw new ApiError('Failed to fetch resources', 500);
    }
  }
}

export default new CloudinaryService();




