import { generateText } from 'ai';
import type { GarminHealthData } from '../../types/index.js';
import { createModel, getDefaultModel, isValidModel, type LLMProvider } from './models.js';
import { buildSystemPrompt, buildUserPrompt } from './provider.interface.js';

export interface AnalyzeOptions {
  provider: LLMProvider;
  apiKey: string;
  healthData: GarminHealthData;
  model?: string;
  customPrompt?: string;
}

export interface AnalysisResult {
  content: string;
  model: string;
  provider: LLMProvider;
  tokensUsed?: number;
}

/**
 * Unified LLM service using Vercel AI SDK.
 * Provides consistent interface across OpenAI, Anthropic, and Google.
 */
export async function analyzeHealthData(options: AnalyzeOptions): Promise<AnalysisResult> {
  const { provider, apiKey, healthData, customPrompt } = options;

  // Use specified model or fall back to provider default
  const modelId = options.model || getDefaultModel(provider);

  // Validate model exists for this provider
  if (options.model && !isValidModel(provider, options.model)) {
    throw new Error(`Invalid model "${options.model}" for provider "${provider}"`);
  }

  // Create the model instance with the API key
  const model = createModel(provider, modelId, apiKey);

  // Generate the analysis using AI SDK
  const result = await generateText({
    model,
    system: buildSystemPrompt(),
    prompt: buildUserPrompt(healthData, customPrompt),
    maxTokens: 8000,
    temperature: 0.5, // Lower temperature for more focused, analytical output
  });

  return {
    content: result.text,
    model: modelId,
    provider,
    tokensUsed: result.usage?.totalTokens,
  };
}
