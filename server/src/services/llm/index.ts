// Unified LLM service exports
export { analyzeHealthData } from './llm.service.js';
export type { AnalyzeOptions, AnalysisResult } from './llm.service.js';

// Model registry exports
export {
  AVAILABLE_MODELS,
  createModel,
  isValidModel,
  getModelInfo,
  isAdvancedModel,
  hasServerKeys,
  hasFreeKey,
  hasPaidKey,
  getApiKeyForTier,
  type ModelInfo,
} from './models.js';

// Prompt building utilities
export { buildSystemPrompt, buildUserPrompt } from './provider.interface.js';
