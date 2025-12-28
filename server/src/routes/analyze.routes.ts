import { Router, type Request, type Response, type NextFunction } from 'express';
import { analyzeHealthData } from '../services/llm/llm.service.js';
import { MODEL_REGISTRY } from '../services/llm/models.js';
import { validate } from '../middleware/index.js';
import { AnalyzeRequestSchema, type ApiResponse, type AnalysisResponse, type LLMProvider } from '../types/index.js';

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
      const { provider, apiKey, healthData, model, customPrompt } = req.body;

      const result = await analyzeHealthData({
        provider: provider as LLMProvider,
        apiKey,
        healthData,
        model,
        customPrompt,
      });

      res.json({
        success: true,
        data: {
          provider: result.provider,
          model: result.model,
          analysis: result.content,
          tokensUsed: result.tokensUsed,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
