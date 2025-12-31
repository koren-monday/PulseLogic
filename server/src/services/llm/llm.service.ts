import { generateText } from 'ai';
import type { GarminHealthData, ChatMessage, LifeContext, StructuredAnalysis } from '../../types/index.js';
import { createModel, getDefaultModel, isValidModel, type LLMProvider } from './models.js';
import { buildSystemPrompt, buildUserPrompt, buildChatSystemPrompt, buildDailyInsightSystemPrompt, buildDailyInsightUserPrompt } from './provider.interface.js';
import { parseAnalysisResponse } from './response-parser.js';

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

export interface DailyInsightOptions {
  provider: LLMProvider;
  apiKey: string;
  healthData: GarminHealthData;
  model?: string;
}

export interface DailyInsightComparison {
  metric: 'sleep' | 'stress' | 'heartRate' | 'bodyBattery' | 'activity';
  lastDayValue: string;
  periodAverage: string;
  trend: 'better' | 'worse' | 'same';
  insight: string;
}

export interface DailyInsightData {
  lastDay: {
    date: string;
    summary: string;
  };
  comparisons: DailyInsightComparison[];
  headline: string;
  topInsight: string;
  quickTips: string[];
  moodEmoji: string;
}

export interface DailyInsightResult {
  insight: DailyInsightData | null;
  model: string;
  provider: LLMProvider;
  tokensUsed?: number;
  error?: string;
}

export interface AnalysisResult {
  content: string;
  structured?: StructuredAnalysis;
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
    maxTokens: 12000, // Increased to accommodate structured JSON output
    temperature: 0.5, // Lower temperature for more focused, analytical output
  });

  // Parse the response to extract markdown and structured data
  const { markdown, structured, parseError } = parseAnalysisResponse(result.text);

  if (parseError) {
    console.warn('Failed to parse structured analysis:', parseError);
  }

  return {
    content: markdown,
    structured: structured || undefined,
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

/**
 * Generate a daily insight comparing the last day to period averages.
 * This is a separate, lighter LLM call focused on a quick daily snapshot.
 */
export async function generateDailyInsight(options: DailyInsightOptions): Promise<DailyInsightResult> {
  const { provider, apiKey, healthData } = options;

  const modelId = options.model || getDefaultModel(provider);

  if (options.model && !isValidModel(provider, options.model)) {
    throw new Error(`Invalid model "${options.model}" for provider "${provider}"`);
  }

  const model = createModel(provider, modelId, apiKey);

  try {
    const result = await generateText({
      model,
      system: buildDailyInsightSystemPrompt(),
      prompt: buildDailyInsightUserPrompt(healthData),
      maxTokens: 2000, // Smaller since this is a focused response
      temperature: 0.3, // Lower for more consistent output
    });

    // Parse the JSON response
    let insightData: DailyInsightData | null = null;
    let parseError: string | undefined;

    try {
      // Try to extract JSON from the response (might be wrapped in code blocks)
      let jsonText = result.text.trim();

      // Remove markdown code blocks if present
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }

      insightData = JSON.parse(jsonText) as DailyInsightData;
    } catch (e) {
      parseError = e instanceof Error ? e.message : 'Failed to parse JSON response';
      console.warn('Failed to parse daily insight JSON:', parseError);
      console.warn('Raw response:', result.text.slice(0, 500));
    }

    return {
      insight: insightData,
      model: modelId,
      provider,
      tokensUsed: result.usage?.totalTokens,
      error: parseError,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate daily insight';
    return {
      insight: null,
      model: modelId,
      provider,
      error: message,
    };
  }
}
