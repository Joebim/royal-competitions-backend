import { Router } from 'express';
import {
  getHomeContent,
  getPageContent,
} from '../controllers/content.controller';

const router = Router();

router.get('/home', getHomeContent);
router.get('/pages/:slug', getPageContent);

export default router;

