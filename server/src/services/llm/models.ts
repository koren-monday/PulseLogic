import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import { MODEL_IDS, type SubscriptionTier } from '../../types/subscription.js';

export interface ModelInfo {
  id: string;
  displayName: string;
  description: string;
  isAdvanced: boolean;
}

// Server-provided API keys for all users (read at runtime to ensure dotenv has loaded)
const getFreeKey = () => process.env.GEMINI_API_KEY_FREE || '';
const getPaidKey = () => process.env.GEMINI_API_KEY_PAID || '';

// Available models - names abstracted for UI
export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: MODEL_IDS.DEFAULT,
    displayName: 'Standard',
    description: 'Quick, efficient analysis',
    isAdvanced: false,
  },
  {
    id: MODEL_IDS.ADVANCED,
    displayName: 'Advanced',
    description: 'Deep multi-step reasoning',
    isAdvanced: true,
  },
];

/**
 * Check if the server has API keys configured.
 */
export function hasServerKeys(): boolean {
  return !!getFreeKey() || !!getPaidKey();
}

/**
 * Check if the server has the free tier API key configured.
 */
export function hasFreeKey(): boolean {
  return !!getFreeKey();
}

/**
 * Check if the server has the paid tier API key configured.
 */
export function hasPaidKey(): boolean {
  return !!getPaidKey();
}

/**
 * Get the appropriate API key for a subscription tier.
 * Throws if key is not configured.
 */
export function getApiKeyForTier(tier: SubscriptionTier): string {
  const key = tier === 'paid' ? getPaidKey() : getFreeKey();
  if (!key) {
    throw new Error(`API key not configured for ${tier} tier`);
  }
  return key;
}

/**
 * Create a Gemini model instance for the given tier and model ID.
 * Uses server-provided API keys.
 */
export function createModel(tier: SubscriptionTier, modelId: string): LanguageModel {
  const apiKey = getApiKeyForTier(tier);
  const google = createGoogleGenerativeAI({ apiKey });
  return google(modelId);
}

/**
 * Get model info by ID.
 */
export function getModelInfo(modelId: string): ModelInfo | undefined {
  return AVAILABLE_MODELS.find(m => m.id === modelId);
}

/**
 * Check if a model is the advanced model.
 */
export function isAdvancedModel(modelId: string): boolean {
  return modelId === MODEL_IDS.ADVANCED;
}

/**
 * Validate that a model ID exists.
 */
export function isValidModel(modelId: string): boolean {
  return AVAILABLE_MODELS.some(m => m.id === modelId);
}
