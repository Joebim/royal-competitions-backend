import { Router } from 'express';
import {
  createCompetition,
  deleteCompetition,
  duplicateCompetition,
  getAdminCompetitions,
  getCompetition,
  getCompetitionEntries,
  updateCompetition,
  updateCompetitionStatus,
} from '../controllers/competition.controller';
import {
  runDraw,
  addManualWinner,
  getDrawForAdmin,
  updateDraw,
  verifyDraw,
  getAllDrawsForAdmin,
  deleteDraw,
} from '../controllers/draw.controller';
import { getCompetitionTickets, deleteTicket } from '../controllers/ticket.controller';
import {
  createChampion,
  deleteChampion,
  getChampion,
  getChampions,
  updateChampion,
} from '../controllers/champion.controller';
import { getAllOrdersForAdmin } from '../controllers/order.controller';
import {
  createUserByAdmin,
  deleteUserByAdmin,
  getUsers,
  getUserById,
  resetUserPasswordByAdmin,
  toggleUserStatus,
  updateUser,
} from '../controllers/user.controller';
import { getDashboardSummary } from '../controllers/admin.controller';
import {
  getAllActivities,
  getRecentActivities,
  getActivitiesByType,
  getActivitiesByEntity,
  getActivitiesByUser,
  getActivitiesByCompetition,
  getActivityStats,
} from '../controllers/activity.controller';
import {
  protect,
  adminOnly,
  superAdminOnly,
} from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createCompetitionSchema,
  updateCompetitionSchema,
} from '../validators/competition.validator';
import {
  createChampionSchema,
  updateChampionSchema,
} from '../validators/champion.validator';
import {
  createAdminUserSchema,
  resetAdminUserPasswordSchema,
  toggleAdminUserStatusSchema,
  updateAdminUserSchema,
} from '../validators/user.validator';
import {
  getAllLegalPages,
  getLegalPageBySlug,
  createLegalPage,
  updateLegalPage,
  deleteLegalPage,
  getAllFAQs,
  getFAQById,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  updateHeroCompetition,
  removeHeroCompetition,
  getAboutPageForAdmin,
  createOrUpdateAboutPage,
  getHomePageSections,
  getHomePageSectionByType,
  createHomePageSection,
  updateHomePageSection,
  reorderHomePageSections,
  deleteHomePageSection,
} from '../controllers/content.controller';
import {
  getAllCategoriesForAdmin,
  getCategoryByIdForAdmin,
  createCategoryForAdmin,
  updateCategoryForAdmin,
  deleteCategoryForAdmin,
} from '../controllers/category.controller';
import {
  createLegalPageSchema,
  updateLegalPageSchema,
  createFAQSchema,
  updateFAQSchema,
  updateHeroCompetitionSchema,
  createAboutPageSchema,
  updateAboutPageSchema,
  createHomePageSectionSchema,
  updateHomePageSectionSchema,
  reorderSectionsSchema,
} from '../validators/content.validator';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../validators/category.validator';
import {
  getAllReviewsForAdmin,
  getReviewByIdForAdmin,
  updateReviewForAdmin,
  deleteReviewForAdmin,
} from '../controllers/review.controller';
import { updateReviewSchema } from '../validators/review.validator';
import { updateDrawSchema } from '../validators/draw.validator';
import {
  getAllWinnersForAdmin,
  getWinnerByIdForAdmin,
  updateWinnerForAdmin,
  deleteWinnerForAdmin,
} from '../controllers/winner.controller';
import { updateWinnerSchema } from '../validators/winner.validator';
import {
  getAllUploads,
  uploadImage,
  uploadMultipleImages,
  deleteImage,
} from '../controllers/upload.controller';

const router = Router();

router.use(protect, adminOnly);

router.get('/dashboard/summary', getDashboardSummary);

// Activity tracking
router.get('/activities', getAllActivities);
router.get('/activities/recent', getRecentActivities);
router.get('/activities/stats', getActivityStats);
router.get('/activities/type/:type', getActivitiesByType);
router.get('/activities/entity/:entity/:entityId', getActivitiesByEntity);
router.get('/activities/user/:userId', getActivitiesByUser);
router.get('/activities/competition/:competitionId', getActivitiesByCompetition);

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
router.post('/competitions/:id/duplicate', duplicateCompetition);
router.get('/competitions/:id/entries', getCompetitionEntries);
router.delete('/competitions/:id', superAdminOnly, deleteCompetition);

// Draw management
router.get('/draws', getAllDrawsForAdmin);
router.post('/competitions/:id/run-draw', runDraw);
router.post('/competitions/:id/add-winner', addManualWinner);
router.get('/competitions/:id/tickets', getCompetitionTickets);
router.delete('/tickets/:id', deleteTicket);
router.get('/draws/:id', getDrawForAdmin);
router.put('/draws/:id', validate(updateDrawSchema), updateDraw);
router.delete('/draws/:id', deleteDraw);
router.get('/draws/:id/verify', verifyDraw);

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
router.post('/users', validate(createAdminUserSchema), createUserByAdmin);
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', validate(updateAdminUserSchema), updateUser);
router.patch('/users/:id', validate(updateAdminUserSchema), updateUser);
router.post(
  '/users/:id/reset-password',
  validate(resetAdminUserPasswordSchema),
  resetUserPasswordByAdmin
);
router.patch(
  '/users/:id/status',
  validate(toggleAdminUserStatusSchema),
  toggleUserStatus
);
router.delete('/users/:id', deleteUserByAdmin);

// Content management - Legal Pages
router.get('/content/pages', getAllLegalPages);
router.post('/content/pages', validate(createLegalPageSchema), createLegalPage);
router.get('/content/pages/:slug', getLegalPageBySlug);
router.put(
  '/content/pages/:slug',
  validate(updateLegalPageSchema),
  updateLegalPage
);
router.delete('/content/pages/:slug', deleteLegalPage);

// Content management - FAQs
router.get('/content/faqs', getAllFAQs);
router.post('/content/faqs', validate(createFAQSchema), createFAQ);
router.get('/content/faqs/:id', getFAQById);
router.put('/content/faqs/:id', validate(updateFAQSchema), updateFAQ);
router.delete('/content/faqs/:id', deleteFAQ);

// Content management - Hero Competition
router.patch(
  '/content/hero',
  validate(updateHeroCompetitionSchema),
  updateHeroCompetition
);
router.delete('/content/hero', removeHeroCompetition);

// Content management - About Page
router.get('/content/about', getAboutPageForAdmin);
router.post(
  '/content/about',
  validate(createAboutPageSchema),
  createOrUpdateAboutPage
);
router.put(
  '/content/about',
  validate(updateAboutPageSchema),
  createOrUpdateAboutPage
);

// Content management - Home Page Sections
router.get('/content/home/sections', getHomePageSections);
router.get('/content/home/sections/:type', getHomePageSectionByType);
router.post(
  '/content/home/sections',
  validate(createHomePageSectionSchema),
  createHomePageSection
);
router.put(
  '/content/home/sections/:type',
  validate(updateHomePageSectionSchema),
  updateHomePageSection
);
router.patch(
  '/content/home/sections/reorder',
  validate(reorderSectionsSchema),
  reorderHomePageSections
);
router.delete('/content/home/sections/:type', deleteHomePageSection);

// Category management
router.get('/categories', getAllCategoriesForAdmin);
router.post(
  '/categories',
  validate(createCategorySchema),
  createCategoryForAdmin
);
router.get('/categories/:id', getCategoryByIdForAdmin);
router.put(
  '/categories/:id',
  validate(updateCategorySchema),
  updateCategoryForAdmin
);
router.delete('/categories/:id', deleteCategoryForAdmin);

// Review management
router.get('/reviews', getAllReviewsForAdmin);
router.get('/reviews/:id', getReviewByIdForAdmin);
router.put('/reviews/:id', validate(updateReviewSchema), updateReviewForAdmin);
router.delete('/reviews/:id', deleteReviewForAdmin);

// Winner management
router.get('/winners', getAllWinnersForAdmin);
router.get('/winners/:id', getWinnerByIdForAdmin);
router.put('/winners/:id', validate(updateWinnerSchema), updateWinnerForAdmin);
router.delete('/winners/:id', deleteWinnerForAdmin);

// Upload management
router.get('/upload/list', getAllUploads);
router.post('/upload/image', upload.single('image'), uploadImage);
router.post('/upload/images', upload.array('images', 10), uploadMultipleImages);
// Use catch-all route to handle publicId with slashes (e.g., "royal-competitions/image123")
// The publicId will be in req.params[0] for catch-all routes
router.delete('/upload/image/*', deleteImage);

export default router;
