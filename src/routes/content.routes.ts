import { Router } from 'express';
import {
  getHomeContent,
  getPageContent,
  getFAQs,
} from '../controllers/content.controller';

const router = Router();

// Public routes
router.get('/home', getHomeContent);
router.get('/pages/:slug', getPageContent);
router.get('/faqs', getFAQs);

export default router;

