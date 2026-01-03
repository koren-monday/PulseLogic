import { generateText } from 'ai';
import type { GarminHealthData, ChatMessage, LifeContext, StructuredAnalysis } from '../../types/index.js';
import { createModel } from './models.js';
import { MODEL_IDS, type SubscriptionTier } from '../../types/subscription.js';
import { buildSystemPrompt, buildUserPrompt, buildChatSystemPrompt, buildDailyInsightSystemPrompt, buildDailyInsightUserPrompt } from './provider.interface.js';
import { parseAnalysisResponse } from './response-parser.js';

export interface AnalyzeOptions {
  tier: SubscriptionTier;
  healthData: GarminHealthData;
  useAdvancedModel?: boolean; // If true and paid tier, use Gemini Pro
  customPrompt?: string;
  lifeContexts?: LifeContext[];
}

export interface ChatOptions {
  tier: SubscriptionTier;
  healthData: GarminHealthData;
  useAdvancedModel?: boolean;
  messages: ChatMessage[];
}

export interface DailyInsightOptions {
  tier: SubscriptionTier;
  healthData: GarminHealthData;
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
  tokensUsed?: number;
  error?: string;
}

export interface AnalysisResult {
  content: string;
  structured?: StructuredAnalysis;
  model: string;
  tokensUsed?: number;
}

/**
 * Determine which model to use based on tier and preference.
 */
function getModelForRequest(tier: SubscriptionTier, useAdvancedModel?: boolean): string {
  // Free tier always uses Flash
  if (tier === 'free') {
    return MODEL_IDS.DEFAULT;
  }
  // Paid tier can choose Pro if requested
  return useAdvancedModel ? MODEL_IDS.ADVANCED : MODEL_IDS.DEFAULT;
}

/**
 * Unified LLM service using Vercel AI SDK.
 * Uses server-provided Gemini API keys based on user's tier.
 */
export async function analyzeHealthData(options: AnalyzeOptions): Promise<AnalysisResult> {
  const { tier, healthData, customPrompt, lifeContexts, useAdvancedModel } = options;

  // Determine which model to use
  const modelId = getModelForRequest(tier, useAdvancedModel);

  // Create the model instance with server-provided API key
  const model = createModel(tier, modelId);

  // Generate the analysis using AI SDK
  const result = await generateText({
    model,
    system: buildSystemPrompt(),
    prompt: buildUserPrompt(healthData, customPrompt, lifeContexts),
    maxOutputTokens: 12000, // Increased to accommodate structured JSON output
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
    tokensUsed: result.usage?.totalTokens,
  };
}

/**
 * Continue a conversation about health data.
 * Maintains context from previous messages for follow-up questions.
 */
export async function chatAboutHealth(options: ChatOptions): Promise<AnalysisResult> {
  const { tier, healthData, messages, useAdvancedModel } = options;

  const modelId = getModelForRequest(tier, useAdvancedModel);
  const model = createModel(tier, modelId);

  // Build messages array for the AI SDK
  const aiMessages = messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  const result = await generateText({
    model,
    system: buildChatSystemPrompt(healthData),
    messages: aiMessages,
    maxOutputTokens: 4000,
    temperature: 0.5,
  });

  return {
    content: result.text,
    model: modelId,
    tokensUsed: result.usage?.totalTokens,
  };
}

/**
 * Generate a daily insight comparing the last day to period averages.
 * This is a separate, lighter LLM call focused on a quick daily snapshot.
 * Always uses Flash model (cost-effective for quick insights).
 */
export async function generateDailyInsight(options: DailyInsightOptions): Promise<DailyInsightResult> {
  const { tier, healthData } = options;

  // Daily insights always use Flash (fast and cheap)
  const modelId = MODEL_IDS.DEFAULT;
  const model = createModel(tier, modelId);

  try {
    const result = await generateText({
      model,
      system: buildDailyInsightSystemPrompt(),
      prompt: buildDailyInsightUserPrompt(healthData),
      maxOutputTokens: 2000, // Smaller since this is a focused response
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
      tokensUsed: result.usage?.totalTokens,
      error: parseError,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate daily insight';
    return {
      insight: null,
      model: modelId,
      error: message,
    };
  }
}
