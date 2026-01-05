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
// Public Pages (for app store compliance)
// ============================================================================

app.get('/privacy', (_req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - Garmin Insights</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; padding: 40px 20px; }
    .container { max-width: 700px; margin: 0 auto; }
    h1 { color: #f8fafc; margin-bottom: 8px; font-size: 28px; }
    .updated { color: #64748b; font-size: 14px; margin-bottom: 32px; }
    h2 { color: #f8fafc; font-size: 18px; margin: 32px 0 12px; }
    p, li { line-height: 1.7; color: #94a3b8; margin-bottom: 12px; }
    ul { padding-left: 24px; margin-bottom: 16px; }
    .highlight { background: #1e293b; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #3b82f6; }
    .highlight p { margin-bottom: 0; color: #cbd5e1; }
    a { color: #60a5fa; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #334155; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Privacy Policy</h1>
    <p class="updated">Last updated: January 2025</p>

    <p>Garmin Insights ("we", "our", or "the app") is committed to protecting your privacy. This policy explains how we handle your data.</p>

    <div class="highlight">
      <p><strong>Key Points:</strong> Your health data is never shared with third parties. Health and fitness data is processed ephemerally for analysis and is not permanently stored on our servers.</p>
    </div>

    <h2>Data We Collect</h2>
    <p>When you use Garmin Insights, we access the following data from your Garmin Connect account:</p>
    <ul>
      <li>Sleep metrics (duration, quality, sleep stages)</li>
      <li>Stress levels and body battery</li>
      <li>Heart rate data</li>
      <li>Activity and workout summaries</li>
    </ul>

    <h2>How We Use Your Data</h2>
    <p><strong>Health & Fitness Data:</strong> Your health data is transmitted directly to AI services (Google Gemini) for analysis and is processed ephemerally. We do not permanently store your raw health metrics on our servers. The data exists only for the duration of the analysis request.</p>

    <p><strong>Analysis Reports:</strong> The AI-generated insights and recommendations may be stored to provide you with report history. These reports contain summaries and recommendations, not your raw health data.</p>

    <p><strong>Account Information:</strong> We store your email address for account identification and to sync your settings across devices.</p>

    <h2>Data Sharing</h2>
    <p>We do not sell, rent, or share your personal data with third parties for marketing purposes. Your data is only processed by:</p>
    <ul>
      <li><strong>Google AI (Gemini):</strong> For generating health insights. Data is processed according to Google's AI terms.</li>
      <li><strong>Firebase:</strong> For authentication and settings storage.</li>
      <li><strong>RevenueCat:</strong> For subscription management (payment info only, no health data).</li>
    </ul>

    <h2>Data Security</h2>
    <p>We use industry-standard security measures:</p>
    <ul>
      <li>All data transmission is encrypted (HTTPS/TLS)</li>
      <li>Garmin OAuth tokens are encrypted at rest</li>
      <li>No raw health data is permanently stored</li>
    </ul>

    <h2>Your Rights</h2>
    <p>You have the right to:</p>
    <ul>
      <li><strong>Access:</strong> View your stored data within the app</li>
      <li><strong>Delete:</strong> Remove your account and all associated data at any time via Settings > Delete Account or at <a href="/delete-account">/delete-account</a></li>
      <li><strong>Disconnect:</strong> Revoke Garmin access through your Garmin Connect settings</li>
    </ul>

    <h2>Children's Privacy</h2>
    <p>Garmin Insights is not intended for users under 13 years of age. We do not knowingly collect data from children.</p>

    <h2>Changes to This Policy</h2>
    <p>We may update this policy periodically. Significant changes will be communicated through the app.</p>

    <h2>Contact Us</h2>
    <p>For privacy questions or concerns, contact us at <a href="mailto:support@garmin-insights.com">support@garmin-insights.com</a></p>

    <div class="footer">
      <p>Garmin Insights is not affiliated with Garmin Ltd. or its subsidiaries.</p>
    </div>
  </div>
</body>
</html>
  `);
});

app.get('/delete-account', (_req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delete Account - Garmin Insights</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .container { max-width: 500px; background: #1e293b; border-radius: 12px; padding: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.3); }
    h1 { color: #f8fafc; margin-bottom: 16px; font-size: 24px; }
    p { line-height: 1.6; margin-bottom: 16px; color: #94a3b8; }
    .steps { background: #334155; border-radius: 8px; padding: 20px; margin: 24px 0; }
    .steps h2 { font-size: 16px; color: #f8fafc; margin-bottom: 12px; }
    .steps ol { padding-left: 20px; }
    .steps li { margin-bottom: 8px; color: #cbd5e1; }
    .contact { margin-top: 24px; padding-top: 24px; border-top: 1px solid #334155; }
    .contact a { color: #60a5fa; text-decoration: none; }
    .contact a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Delete Your Account</h1>
    <p>We're sorry to see you go. You can delete your Garmin Insights account and all associated data using the steps below.</p>

    <div class="steps">
      <h2>Delete from the App</h2>
      <ol>
        <li>Open the Garmin Insights app</li>
        <li>Tap the Settings icon (gear) in the header</li>
        <li>Scroll down and tap "Delete Account"</li>
        <li>Confirm your decision</li>
      </ol>
    </div>

    <p>This will permanently delete:</p>
    <ul style="padding-left: 20px; margin-bottom: 16px; color: #94a3b8;">
      <li>Your account and profile</li>
      <li>All health reports and analysis history</li>
      <li>Saved actions and tracking data</li>
      <li>Personal statistics and trends</li>
    </ul>

    <div class="contact">
      <p>If you're unable to access the app, please contact us at <a href="mailto:support@garmin-insights.com">support@garmin-insights.com</a> to request account deletion.</p>
    </div>
  </div>
</body>
</html>
  `);
});

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
