import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import competitionRoutes from './competition.routes';
import drawRoutes from './draw.routes';
import championRoutes from './champion.routes';
import orderRoutes from './order.routes';
import paymentRoutes from './payment.routes';
import newsletterRoutes from './newsletter.routes';
import uploadRoutes from './upload.routes';
import cartRoutes from './cart.routes';
import checkoutRoutes from './checkout.routes';
import contentRoutes from './content.routes';
import reviewRoutes from './review.routes';
import statsRoutes from './stats.routes';
import adminRoutes from './admin.routes';
import winnerRoutes from './winner.routes';
import ticketRoutes from './ticket.routes';
import categoryRoutes from './category.routes';
import entryRoutes from './entry.routes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/competitions', competitionRoutes);
router.use('/draws', drawRoutes);
router.use('/champions', championRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/upload', uploadRoutes);
router.use('/cart', cartRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/content', contentRoutes);
router.use('/reviews', reviewRoutes);
router.use('/stats', statsRoutes);
router.use('/admin', adminRoutes);
router.use('/winners', winnerRoutes);
router.use('/tickets', ticketRoutes);
router.use('/categories', categoryRoutes);
router.use('/entries', entryRoutes);

export default router;
