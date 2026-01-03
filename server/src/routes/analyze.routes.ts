import { Router, type Request, type Response, type NextFunction } from 'express';
import { analyzeHealthData, chatAboutHealth, generateDailyInsight } from '../services/llm/llm.service.js';
import { AVAILABLE_MODELS, hasServerKeys } from '../services/llm/models.js';
import { validate } from '../middleware/index.js';
import {
  AnalyzeRequestSchema,
  ChatRequestSchema,
  DailyInsightRequestSchema,
  type ApiResponse,
  type AnalysisResponse,
  type ChatResponse,
  type DailyInsightResponse,
} from '../types/index.js';
import {
  canCreateReport,
  canSendChatMessage,
  recordReportCreated,
  recordChatMessage,
  getEffectiveTier,
} from '../services/usage.service.js';
import { isModelAllowed, MODEL_IDS } from '../types/subscription.js';

const router = Router();

/**
 * GET /api/analyze/models
 * Get available models - now simplified to just Gemini models
 */
router.get('/models', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      models: AVAILABLE_MODELS,
      serverReady: hasServerKeys(),
    },
  });
});

/**
 * POST /api/analyze
 * Analyze health data using server-provided Gemini API
 * Enforces tier-based limits on report creation
 */
router.post(
  '/',
  validate(AnalyzeRequestSchema),
  async (req: Request, res: Response<ApiResponse<AnalysisResponse>>, next: NextFunction) => {
    try {
      const { healthData, customPrompt, lifeContexts, userId, useAdvancedModel } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'userId is required',
        });
        return;
      }

      // Check tier limits
      const reportCheck = await canCreateReport(userId);
      if (!reportCheck.allowed) {
        res.status(429).json({
          success: false,
          error: reportCheck.reason || 'Report limit reached',
        });
        return;
      }

      // Get user's tier
      const tierInfo = await getEffectiveTier(userId);

      // Check if advanced model is allowed for this tier
      let effectiveUseAdvanced = useAdvancedModel;
      if (useAdvancedModel && !isModelAllowed(tierInfo.tier, MODEL_IDS.ADVANCED)) {
        effectiveUseAdvanced = false; // Force to Flash for free tier
      }

      const result = await analyzeHealthData({
        tier: tierInfo.tier,
        healthData,
        useAdvancedModel: effectiveUseAdvanced,
        customPrompt,
        lifeContexts,
      });

      // Record usage
      await recordReportCreated(userId);

      res.json({
        success: true,
        data: {
          model: result.model,
          analysis: result.content,
          structured: result.structured,
          tokensUsed: result.tokensUsed,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/analyze/chat
 * Continue a conversation about the health data with follow-up questions
 * Enforces tier-based limits on chat messages
 */
router.post(
  '/chat',
  validate(ChatRequestSchema),
  async (req: Request, res: Response<ApiResponse<ChatResponse>>, next: NextFunction) => {
    try {
      const { healthData, messages, userId, reportId, useAdvancedModel } = req.body;

      if (!userId || !reportId) {
        res.status(400).json({
          success: false,
          error: 'userId and reportId are required',
        });
        return;
      }

      // Check tier limits
      const chatCheck = await canSendChatMessage(userId, reportId);
      if (!chatCheck.allowed) {
        res.status(429).json({
          success: false,
          error: chatCheck.reason || 'Chat limit reached',
        });
        return;
      }

      // Get user's tier
      const tierInfo = await getEffectiveTier(userId);

      // Check if advanced model is allowed
      let effectiveUseAdvanced = useAdvancedModel;
      if (useAdvancedModel && !isModelAllowed(tierInfo.tier, MODEL_IDS.ADVANCED)) {
        effectiveUseAdvanced = false;
      }

      const result = await chatAboutHealth({
        tier: tierInfo.tier,
        healthData,
        useAdvancedModel: effectiveUseAdvanced,
        messages,
      });

      // Record usage
      await recordChatMessage(userId, reportId);

      res.json({
        success: true,
        data: {
          model: result.model,
          message: result.content,
          tokensUsed: result.tokensUsed,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/analyze/daily-insight
 * Generate a quick daily insight comparing the last day to period averages
 * Always uses Gemini Flash (fast and cost-effective)
 */
router.post(
  '/daily-insight',
  validate(DailyInsightRequestSchema),
  async (req: Request, res: Response<ApiResponse<DailyInsightResponse>>, next: NextFunction) => {
    try {
      const { healthData, userId } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'userId is required',
        });
        return;
      }

      // Get user's tier for API key selection
      const tierInfo = await getEffectiveTier(userId);

      const result = await generateDailyInsight({
        tier: tierInfo.tier,
        healthData,
      });

      res.json({
        success: true,
        data: {
          model: result.model,
          insight: result.insight,
          tokensUsed: result.tokensUsed,
          error: result.error,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
