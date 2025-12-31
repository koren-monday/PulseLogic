import { Router, type Request, type Response, type NextFunction } from 'express';
import { analyzeHealthData, chatAboutHealth, generateDailyInsight } from '../services/llm/llm.service.js';
import { MODEL_REGISTRY } from '../services/llm/models.js';
import { validate } from '../middleware/index.js';
import {
  AnalyzeRequestSchema,
  ChatRequestSchema,
  DailyInsightRequestSchema,
  type ApiResponse,
  type AnalysisResponse,
  type ChatResponse,
  type DailyInsightResponse,
  type LLMProvider,
} from '../types/index.js';

const router = Router();

/**
 * GET /api/analyze/models
 * Get available models for all providers
 */
router.get('/models', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: MODEL_REGISTRY,
  });
});

/**
 * POST /api/analyze
 * Analyze health data using the specified LLM provider and model
 */
router.post(
  '/',
  validate(AnalyzeRequestSchema),
  async (req: Request, res: Response<ApiResponse<AnalysisResponse>>, next: NextFunction) => {
    try {
      const { provider, apiKey, healthData, model, customPrompt, lifeContexts } = req.body;

      const result = await analyzeHealthData({
        provider: provider as LLMProvider,
        apiKey,
        healthData,
        model,
        customPrompt,
        lifeContexts,
      });

      res.json({
        success: true,
        data: {
          provider: result.provider,
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
 */
router.post(
  '/chat',
  validate(ChatRequestSchema),
  async (req: Request, res: Response<ApiResponse<ChatResponse>>, next: NextFunction) => {
    try {
      const { provider, apiKey, healthData, model, messages } = req.body;

      const result = await chatAboutHealth({
        provider: provider as LLMProvider,
        apiKey,
        healthData,
        model,
        messages,
      });

      res.json({
        success: true,
        data: {
          provider: result.provider,
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
 */
router.post(
  '/daily-insight',
  validate(DailyInsightRequestSchema),
  async (req: Request, res: Response<ApiResponse<DailyInsightResponse>>, next: NextFunction) => {
    try {
      const { provider, apiKey, healthData, model } = req.body;

      const result = await generateDailyInsight({
        provider: provider as LLMProvider,
        apiKey,
        healthData,
        model,
      });

      res.json({
        success: true,
        data: {
          provider: result.provider,
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
