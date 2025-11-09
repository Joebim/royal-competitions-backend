import { Router } from 'express';
import {
  createCompetition,
  deleteCompetition,
  getAdminCompetitions,
  getCompetition,
  getCompetitionEntries,
  updateCompetition,
  updateCompetitionStatus,
} from '../controllers/competition.controller';
import {
  createDraw,
  deleteDraw,
  getDraw,
  getDraws,
  updateDraw,
} from '../controllers/draw.controller';
import {
  createChampion,
  deleteChampion,
  getChampion,
  getChampions,
  updateChampion,
} from '../controllers/champion.controller';
import { getAllOrdersForAdmin } from '../controllers/order.controller';
import { getUsers, getUserById, updateUser } from '../controllers/user.controller';
import { getDashboardSummary } from '../controllers/admin.controller';
import { protect, adminOnly, superAdminOnly } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createCompetitionSchema,
  updateCompetitionSchema,
} from '../validators/competition.validator';
import { createDrawSchema, updateDrawSchema } from '../validators/draw.validator';
import {
  createChampionSchema,
  updateChampionSchema,
} from '../validators/champion.validator';

const router = Router();

router.use(protect, adminOnly);

router.get('/dashboard/summary', getDashboardSummary);

// Competition management
router.get('/competitions', getAdminCompetitions);
router.post(
  '/competitions',
  upload.array('images', 10),
  validate(createCompetitionSchema),
  createCompetition
);
router.get('/competitions/:id', getCompetition);
router.put(
  '/competitions/:id',
  upload.array('images', 10),
  validate(updateCompetitionSchema),
  updateCompetition
);
router.patch('/competitions/:id/status', updateCompetitionStatus);
router.get('/competitions/:id/entries', getCompetitionEntries);
router.delete('/competitions/:id', superAdminOnly, deleteCompetition);

// Draw management
router.get('/draws', getDraws);
router.post('/draws', validate(createDrawSchema), createDraw);
router.get('/draws/:id', getDraw);
router.put('/draws/:id', validate(updateDrawSchema), updateDraw);
router.delete('/draws/:id', deleteDraw);

// Champions management
router.get('/champions', getChampions);
router.post(
  '/champions',
  upload.single('image'),
  validate(createChampionSchema),
  createChampion
);
router.get('/champions/:id', getChampion);
router.put(
  '/champions/:id',
  upload.single('image'),
  validate(updateChampionSchema),
  updateChampion
);
router.delete('/champions/:id', deleteChampion);

// Orders overview
router.get('/orders', getAllOrdersForAdmin);

// Users management
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id', updateUser);

export default router;

