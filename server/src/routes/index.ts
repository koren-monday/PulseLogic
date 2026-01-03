import { Router } from 'express';
import garminRoutes from './garmin.routes.js';
import analyzeRoutes from './analyze.routes.js';
import userRoutes from './user.routes.js';
import subscriptionRoutes from './subscription.routes.js';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount route groups
router.use('/garmin', garminRoutes);
router.use('/analyze', analyzeRoutes);
router.use('/user', userRoutes);
router.use('/subscription', subscriptionRoutes);

export default router;
