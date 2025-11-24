import { Router } from 'express';
import {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  getAllUploads,
} from '../controllers/upload.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// All routes are protected and admin only
// Note: These routes are now also available under /admin/upload
router.use(protect);
router.use(adminOnly);

router.get('/list', getAllUploads);
router.post('/image', upload.single('image'), uploadImage);
router.post('/images', upload.array('images', 10), uploadMultipleImages);
router.delete('/image/:publicId', deleteImage);

export default router;




