import multer from 'multer';
import { config } from '../config/environment';
import { ApiError } from '../utils/apiError';

// Configure multer storage (memory to stream directly to Cloudinary)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (config.upload.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError('Invalid file type. Only images and videos are allowed.', 400));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter,
});




