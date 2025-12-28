import { Router } from 'express';
import garminRoutes from './garmin.routes.js';
import analyzeRoutes from './analyze.routes.js';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount route groups
router.use('/garmin', garminRoutes);
router.use('/analyze', analyzeRoutes);

export default router;
