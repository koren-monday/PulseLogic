import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModelV1 } from 'ai';

export type LLMProvider = 'openai' | 'anthropic' | 'google';

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
}

export interface ProviderConfig {
  name: string;
  models: ModelInfo[];
  defaultModel: string;
}

// Model registry - maps provider to available models
export const MODEL_REGISTRY: Record<LLMProvider, ProviderConfig> = {
  openai: {
    name: 'OpenAI',
    defaultModel: 'gpt-5.2',
    models: [
      { id: 'gpt-5.2', name: 'GPT-5.2', description: 'Most capable model for complex tasks' },
      { id: 'gpt-5.2-pro', name: 'GPT-5.2 Pro', description: 'Uses more compute for better answers' },
    ],
  },
  anthropic: {
    name: 'Anthropic',
    defaultModel: 'claude-sonnet-4-5-20250929',
    models: [
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', description: 'Fast and intelligent' },
      { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', description: 'Most capable Claude model' },
    ],
  },
  google: {
    name: 'Google',
    defaultModel: 'gemini-3-flash-preview',
    models: [
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Fast and cost-effective' },
      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Advanced reasoning capabilities' },
    ],
  },
};

// Factory function to create a model instance based on provider, model ID, and API key
export function createModel(
  provider: LLMProvider,
  modelId: string,
  apiKey: string
): LanguageModelV1 {
  switch (provider) {
    case 'openai': {
      const openai = createOpenAI({ apiKey });
      return openai(modelId);
    }
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(modelId);
    }
    case 'google': {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(modelId);
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Get default model for a provider
export function getDefaultModel(provider: LLMProvider): string {
  return MODEL_REGISTRY[provider].defaultModel;
}

// Validate that a model ID exists for the given provider
export function isValidModel(provider: LLMProvider, modelId: string): boolean {
  return MODEL_REGISTRY[provider].models.some(m => m.id === modelId);
}
