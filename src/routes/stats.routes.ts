import { Router } from 'express';
import { getSiteStats } from '../controllers/stats.controller';

const router = Router();

router.get('/site', getSiteStats);

export default router;

