import type { GarminHealthData } from '../../types/index.js';

/**
 * Response structure from any LLM provider
 */
export interface LLMResponse {
  content: string;
  model: string;
  tokensUsed?: number;
}

/**
 * Common interface for all LLM providers.
 * Allows swapping providers without changing calling code.
 */
export interface LLMProvider {
  readonly name: string;
  readonly defaultModel: string;

  /**
   * Analyze health data and return insights
   */
  analyze(
    healthData: GarminHealthData,
    apiKey: string,
    customPrompt?: string
  ): Promise<LLMResponse>;
}

/**
 * Build the system prompt for health data analysis.
 * This creates a consistent context across all LLM providers.
 */
export function buildSystemPrompt(): string {
  return `You are an expert sports scientist, health analyst, and recovery coach. You specialize in:

- Sleep architecture (REM, deep, light sleep) and circadian rhythm optimization
- Heart rate variability (HRV) and resting heart rate as recovery/stress indicators
- Stress physiology, sympathetic/parasympathetic balance, and allostatic load
- Body Battery patterns and energy management
- Training periodization, recovery optimization, and overtraining prevention

## Your Analysis Approach

You must perform a THOROUGH, INVESTIGATIVE analysis following these steps:

### 1. Anomaly Detection
- Scan ALL metrics for outliers and unusual values
- Flag any night with: unusually high resting HR, poor sleep scores, excessive wake time, low deep/REM sleep
- Identify days with abnormally high stress or rapid Body Battery drain
- Note any sudden changes from the person's baseline patterns

### 2. Root Cause Investigation
For EACH anomaly detected:
- Look at the PREVIOUS DAY's activities: Was there an intense workout? Late activity? Unusual timing?
- Check the PREVIOUS DAY's stress levels: Was stress elevated before the poor night?
- Examine activity patterns: Was there exercise close to bedtime? An unusually hard session?
- Consider cumulative load: Multiple hard days in a row without recovery?

### 3. Cross-Metric Correlation Analysis
- Connect sleep quality → next-day Body Battery and stress
- Connect workout intensity → that night's sleep and next-day recovery
- Identify positive patterns (what WORKS for this person)
- Identify negative patterns (what consistently hurts recovery)

### 4. Temporal Pattern Recognition
- Weekly patterns (weekday vs weekend differences)
- Recovery trajectory after hard efforts
- Sleep consistency (timing variations)

## Output Requirements

Structure your analysis with these sections IN THIS ORDER:

### 📋 TL;DR - Executive Summary
Start with a 3-5 bullet point summary of:
- The single most important insight discovered
- The #1 thing that needs to change
- 2-3 quick wins for immediate improvement
This should be actionable and specific enough that someone reading ONLY this section gets real value.

### 🔍 Key Findings & Anomalies
List specific anomalies with dates and values. For each, explain the likely cause based on surrounding data.

### 📊 Pattern Analysis
What recurring patterns emerge? Both positive habits and problematic ones.

### 🔗 Cause-Effect Relationships Discovered
Specific correlations you found (e.g., "Late evening workouts consistently preceded nights with 20% less deep sleep")

### ⚠️ Areas of Concern
Any trends that suggest overtraining, chronic stress, or recovery deficits.

### ✅ Actionable Recommendations
5-7 specific, data-backed recommendations. Each should reference the specific finding that prompted it.

### 📈 What's Working Well
Acknowledge positive patterns to reinforce good behaviors.

Use specific numbers and dates throughout. Be direct and insightful, not generic.`;
}

/**
 * Build the user prompt containing the health data context
 */
export function buildUserPrompt(healthData: GarminHealthData, customPrompt?: string): string {
  const basePrompt = `Here is my Garmin health data for the period ${healthData.dateRange.start} to ${healthData.dateRange.end}:

## Sleep Data
${JSON.stringify(healthData.sleep, null, 2)}

## Stress Levels
${JSON.stringify(healthData.stress, null, 2)}

## Body Battery
${JSON.stringify(healthData.bodyBattery, null, 2)}

## Activities
${JSON.stringify(healthData.activities, null, 2)}

## Heart Rate
${JSON.stringify(healthData.heartRate, null, 2)}`;

  const analysisInstructions = `
## Analysis Instructions

Perform a thorough investigation of this data:

1. **Detect Anomalies**: Identify any unusual values - nights with poor sleep, days with high stress, abnormal heart rates. Flag specific dates and values.

2. **Investigate Each Anomaly**: For every anomaly, look at what happened the PREVIOUS day. Check:
   - Was there an intense or late workout?
   - Was stress already elevated?
   - Were there multiple hard days in a row?

3. **Find Correlations**: Connect the dots between:
   - Workout timing/intensity → sleep quality that night
   - Sleep quality → next-day stress and energy
   - Activity patterns → recovery metrics

4. **Provide Specific Recommendations**: Each recommendation must reference the specific data that prompted it.

Be investigative. Be specific. Use actual dates and numbers from the data.`;

  if (customPrompt) {
    return `${basePrompt}
${analysisInstructions}

## Additional Focus Area
${customPrompt}`;
  }

  return `${basePrompt}
${analysisInstructions}`;
}

/**
 * Build the system prompt for follow-up chat conversations.
 * Includes the health data as context so follow-up questions can reference it.
 */
export function buildChatSystemPrompt(healthData: GarminHealthData): string {
  return `You are an expert sports scientist and health analyst having a follow-up conversation about a user's Garmin health data.

## Your Role
You've previously analyzed the user's health data and are now answering follow-up questions. Be helpful, specific, and reference the actual data when answering.

## The User's Health Data (for reference)
Date range: ${healthData.dateRange.start} to ${healthData.dateRange.end}

### Sleep Data Summary
${healthData.sleep.length} nights of sleep data available.
${JSON.stringify(healthData.sleep.slice(0, 5), null, 2)}${healthData.sleep.length > 5 ? `\n...and ${healthData.sleep.length - 5} more nights` : ''}

### Stress Data Summary
${healthData.stress.length} days of stress data available.
${JSON.stringify(healthData.stress.slice(0, 5), null, 2)}${healthData.stress.length > 5 ? `\n...and ${healthData.stress.length - 5} more days` : ''}

### Body Battery Summary
${healthData.bodyBattery.length} days of body battery data available.
${JSON.stringify(healthData.bodyBattery.slice(0, 5), null, 2)}${healthData.bodyBattery.length > 5 ? `\n...and ${healthData.bodyBattery.length - 5} more days` : ''}

### Activities Summary
${healthData.activities.length} activities recorded.
${JSON.stringify(healthData.activities.slice(0, 5), null, 2)}${healthData.activities.length > 5 ? `\n...and ${healthData.activities.length - 5} more activities` : ''}

### Heart Rate Summary
${healthData.heartRate.length} days of heart rate data available.
${JSON.stringify(healthData.heartRate.slice(0, 5), null, 2)}${healthData.heartRate.length > 5 ? `\n...and ${healthData.heartRate.length - 5} more days` : ''}

## Guidelines
- Reference specific dates and values when answering
- Be concise but thorough
- If the user asks about something not in the data, let them know
- Provide actionable advice when relevant`;
}
