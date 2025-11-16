import { Router } from 'express';
import {
  getHomeContent,
  getPageContent,
  getAllLegalPagesPublic,
  getFAQs,
  getAboutPage,
} from '../controllers/content.controller';

const router = Router();

// Public routes
router.get('/home', getHomeContent);
router.get('/pages', getAllLegalPagesPublic);
router.get('/pages/:slug', getPageContent);
router.get('/faqs', getFAQs);
router.get('/about', getAboutPage);

export default router;

