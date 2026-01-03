import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModelV1 } from 'ai';
import { GEMINI_MODELS, type SubscriptionTier } from '../../types/subscription.js';

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  isAdvanced: boolean; // Pro model = advanced
}

// Server-provided API keys for all users
// Free tier uses GEMINI_API_KEY_FREE, Paid tier uses GEMINI_API_KEY_PAID
const GEMINI_API_KEY_FREE = process.env.GEMINI_API_KEY_FREE || '';
const GEMINI_API_KEY_PAID = process.env.GEMINI_API_KEY_PAID || '';

// Available Gemini models
export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: GEMINI_MODELS.FLASH,
    name: 'Gemini 3 Flash',
    description: 'Fast and cost-effective',
    isAdvanced: false,
  },
  {
    id: GEMINI_MODELS.PRO,
    name: 'Gemini 3 Pro',
    description: 'Advanced reasoning capabilities',
    isAdvanced: true,
  },
];

/**
 * Check if the server has API keys configured.
 */
export function hasServerKeys(): boolean {
  return !!GEMINI_API_KEY_FREE || !!GEMINI_API_KEY_PAID;
}

/**
 * Check if the server has the free tier API key configured.
 */
export function hasFreeKey(): boolean {
  return !!GEMINI_API_KEY_FREE;
}

/**
 * Check if the server has the paid tier API key configured.
 */
export function hasPaidKey(): boolean {
  return !!GEMINI_API_KEY_PAID;
}

/**
 * Get the appropriate API key for a subscription tier.
 * Throws if key is not configured.
 */
export function getApiKeyForTier(tier: SubscriptionTier): string {
  const key = tier === 'paid' ? GEMINI_API_KEY_PAID : GEMINI_API_KEY_FREE;
  if (!key) {
    throw new Error(`API key not configured for ${tier} tier`);
  }
  return key;
}

/**
 * Create a Gemini model instance for the given tier and model ID.
 * Uses server-provided API keys.
 */
export function createModel(tier: SubscriptionTier, modelId: string): LanguageModelV1 {
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
 * Check if a model is the advanced (Pro) model.
 */
export function isAdvancedModel(modelId: string): boolean {
  return modelId === GEMINI_MODELS.PRO;
}

/**
 * Validate that a model ID exists.
 */
export function isValidModel(modelId: string): boolean {
  return AVAILABLE_MODELS.some(m => m.id === modelId);
}
