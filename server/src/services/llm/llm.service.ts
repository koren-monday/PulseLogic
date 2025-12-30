import { generateText } from 'ai';
import type { GarminHealthData, ChatMessage, LifeContext } from '../../types/index.js';
import { createModel, getDefaultModel, isValidModel, type LLMProvider } from './models.js';
import { buildSystemPrompt, buildUserPrompt, buildChatSystemPrompt } from './provider.interface.js';

export interface AnalyzeOptions {
  provider: LLMProvider;
  apiKey: string;
  healthData: GarminHealthData;
  model?: string;
  customPrompt?: string;
  lifeContexts?: LifeContext[];
}

export interface ChatOptions {
  provider: LLMProvider;
  apiKey: string;
  healthData: GarminHealthData;
  model?: string;
  messages: ChatMessage[];
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
  const { provider, apiKey, healthData, customPrompt, lifeContexts } = options;

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
    prompt: buildUserPrompt(healthData, customPrompt, lifeContexts),
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

/**
 * Continue a conversation about health data.
 * Maintains context from previous messages for follow-up questions.
 */
export async function chatAboutHealth(options: ChatOptions): Promise<AnalysisResult> {
  const { provider, apiKey, healthData, messages } = options;

  const modelId = options.model || getDefaultModel(provider);

  if (options.model && !isValidModel(provider, options.model)) {
    throw new Error(`Invalid model "${options.model}" for provider "${provider}"`);
  }

  const model = createModel(provider, modelId, apiKey);

  // Build messages array for the AI SDK
  const aiMessages = messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  const result = await generateText({
    model,
    system: buildChatSystemPrompt(healthData),
    messages: aiMessages,
    maxTokens: 4000,
    temperature: 0.5,
  });

  return {
    content: result.text,
    model: modelId,
    provider,
    tokensUsed: result.usage?.totalTokens,
  };
}
