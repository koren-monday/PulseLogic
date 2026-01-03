import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';

import routes from './routes/index.js';
import { errorHandler } from './middleware/index.js';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3002;

// ============================================================================
// Security Middleware
// ============================================================================

// Basic security headers
app.use(helmet());

// CORS configuration - allow frontend and Capacitor origins
const allowedOrigins = [
  process.env.ALLOWED_ORIGIN, // Production frontend
  'capacitor://localhost', // Capacitor iOS
  'https://localhost', // Capacitor Android
  'http://localhost', // Capacitor Android (http)
  'http://localhost:5173', // Dev frontend
  'http://127.0.0.1:5173',
  'http://10.0.2.2:5173', // Android emulator
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, same-origin)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In production, reject unknown origins; in dev, allow all
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('Not allowed by CORS'));
      } else {
        callback(null, true);
      }
    }
  },
  credentials: true,
}));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ============================================================================
// Body Parsing Middleware
// ============================================================================

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// API Routes
// ============================================================================

app.use('/api', routes);

// ============================================================================
// Error Handling
// ============================================================================

app.use(errorHandler);

// ============================================================================
// Server Start
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           Garmin Insights Engine - Backend Server          ║
╠════════════════════════════════════════════════════════════╣
║  Status:    Running                                        ║
║  Port:      ${String(PORT).padEnd(46)}║
║  Mode:      ${(process.env.NODE_ENV || 'development').padEnd(46)}║
║  API Base:  http://localhost:${PORT}/api${' '.repeat(25)}║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
