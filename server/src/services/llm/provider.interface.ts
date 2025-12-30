import type { GarminHealthData, LifeContext } from '../../types/index.js';

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
 * Format life contexts into a human-readable section for the AI prompt.
 * Provides temporal context and expectations for metric analysis.
 */
function formatLifeContexts(lifeContexts: LifeContext[]): string {
  if (!lifeContexts || lifeContexts.length === 0) return '';

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calculateDaysAgo = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const contextDescriptions = lifeContexts.map(ctx => {
    switch (ctx.type) {
      case 'new_baby': {
        const daysAgo = calculateDaysAgo(ctx.birthDate);
        const date = formatDate(ctx.birthDate);
        return `- **New Baby**: Born ${date} (${daysAgo}). ${ctx.notes || ''}
  CONTEXT: Expect significant sleep disruption, elevated stress, irregular patterns. Recovery metrics may be compromised. This is expected and normal for new parents.`;
      }

      case 'pregnancy': {
        let detail = '';
        if (ctx.currentWeek) detail = `Currently week ${ctx.currentWeek}`;
        else if (ctx.dueDate) detail = `Due ${formatDate(ctx.dueDate)}`;
        return `- **Pregnancy**: ${detail}. ${ctx.notes || ''}
  CONTEXT: Resting heart rate typically elevated. Sleep architecture changes throughout pregnancy. Body Battery may show different patterns. Evaluate metrics against pregnancy baselines, not pre-pregnancy.`;
      }

      case 'diet_change': {
        const dietLabels: Record<string, string> = {
          keto: 'Ketogenic diet',
          low_carb: 'Low carbohydrate diet',
          vegan: 'Vegan diet',
          vegetarian: 'Vegetarian diet',
          fasting: 'Intermittent fasting',
          calorie_restriction: 'Calorie restriction',
          other: ctx.customDietType || 'Diet change',
        };
        const diet = dietLabels[ctx.dietType] || ctx.dietType;
        const startedAgo = calculateDaysAgo(ctx.startDate);
        return `- **Diet Change**: ${diet} started ${formatDate(ctx.startDate)} (${startedAgo}). ${ctx.notes || ''}
  CONTEXT: Diet changes can affect energy levels, sleep quality, and recovery. Keto/low-carb may cause initial fatigue. Fasting may affect workout timing and recovery.`;
      }

      case 'stress_event': {
        const severityImpact = {
          mild: 'Minor impact expected',
          moderate: 'Noticeable impact on stress metrics and sleep quality likely',
          severe: 'Significant impact on all metrics expected - elevated stress, disrupted sleep, reduced recovery',
        };
        return `- **Stress Event** (${ctx.severity}): ${ctx.category} - ${ctx.description}${ctx.startDate ? `. Started ${formatDate(ctx.startDate)}` : ''}.
  CONTEXT: ${severityImpact[ctx.severity]}. Consider this when analyzing stress levels and sleep quality.`;
      }

      case 'illness': {
        const illnessLabels: Record<string, string> = {
          cold_flu: 'Cold/Flu',
          injury: 'Injury',
          surgery: 'Surgery',
          covid: 'COVID-19',
          chronic: 'Chronic condition',
          other: ctx.customIllnessType || 'Illness',
        };
        const illness = illnessLabels[ctx.illnessType] || ctx.illnessType;
        const ongoing = ctx.endDate ? `Ended ${formatDate(ctx.endDate)}` : 'Ongoing';
        return `- **Illness/Recovery**: ${illness} starting ${formatDate(ctx.startDate)}. ${ongoing}. ${ctx.notes || ''}
  CONTEXT: Illness significantly affects all metrics. Elevated resting HR, poor sleep quality, low Body Battery are expected during illness. Recovery period may show gradual improvement.`;
      }

      case 'travel': {
        const tzInfo = ctx.timezoneChange ? `Timezone change: ${ctx.timezoneChange}` : 'Travel';
        const duration = ctx.endDate
          ? `${formatDate(ctx.startDate)} to ${formatDate(ctx.endDate)}`
          : `From ${formatDate(ctx.startDate)}`;
        return `- **Travel**: ${tzInfo}. ${duration}. ${ctx.notes || ''}
  CONTEXT: Jet lag and timezone changes disrupt circadian rhythm. Expect 1-2 days of adjustment per hour of timezone shift. Sleep timing and quality may be affected.`;
      }

      case 'training_goal': {
        const eventLabels: Record<string, string> = {
          marathon: 'Marathon',
          half_marathon: 'Half Marathon',
          triathlon: 'Triathlon',
          '5k_10k': '5K/10K',
          competition: 'Competition',
          other: ctx.customEventType || 'Event',
        };
        const event = eventLabels[ctx.eventType] || ctx.eventType;
        const dateInfo = ctx.eventDate ? ` on ${formatDate(ctx.eventDate)}` : '';
        return `- **Training Goal**: ${event}${dateInfo}. ${ctx.notes || ''}
  CONTEXT: Training for an event means periodized load. Look for appropriate stress/recovery balance. Consider taper periods before events. Higher training load should correlate with adequate recovery.`;
      }

      case 'medication': {
        const duration = ctx.endDate
          ? `${formatDate(ctx.startDate)} to ${formatDate(ctx.endDate)}`
          : `Since ${formatDate(ctx.startDate)} (ongoing)`;
        return `- **Medication**: ${ctx.medicationName}. ${duration}. ${ctx.notes || ''}
  CONTEXT: Some medications affect heart rate (beta blockers lower it), sleep architecture (sleep aids), or stress response. Consider medication effects when analyzing metrics.`;
      }

      case 'other':
        return `- **Other Context**: ${ctx.description}
  CONTEXT: Consider this information when analyzing patterns and providing recommendations.`;

      default:
        return '';
    }
  });

  return `
## Personal Life Context

The user has provided the following personal circumstances that may affect their health metrics:

${contextDescriptions.filter(Boolean).join('\n\n')}

**IMPORTANT**: Use this context to:
1. Correlate metric anomalies with life events (e.g., poor sleep coinciding with new baby)
2. Adjust expectations - some "problems" are expected given the circumstances
3. Provide contextually appropriate recommendations
4. Avoid suggesting changes that conflict with their current situation`;
}

/**
 * Build the user prompt containing the health data context
 */
export function buildUserPrompt(healthData: GarminHealthData, customPrompt?: string, lifeContexts?: LifeContext[]): string {
  const lifeContextSection = formatLifeContexts(lifeContexts || []);

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

  // Combine all sections
  let fullPrompt = basePrompt + '\n' + analysisInstructions;

  if (lifeContextSection) {
    fullPrompt += '\n' + lifeContextSection;
  }

  if (customPrompt) {
    fullPrompt += `\n\n## Additional Focus Area
${customPrompt}`;
  }

  return fullPrompt;
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
