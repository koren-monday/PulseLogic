// ============================================================================
// Structured Analysis Types
// These types define the parsed, structured output from AI health analysis
// ============================================================================

/**
 * Health score components (0-100 scale)
 */
export interface HealthMetrics {
  overallScore: number;
  sleepScore: number;
  stressScore: number;      // Higher is better (inverted from raw stress)
  recoveryScore: number;
  activityScore: number;
}

/**
 * Detected anomaly in health data
 */
export interface Anomaly {
  id: string;
  date: string;
  metric: 'sleep' | 'stress' | 'heartRate' | 'bodyBattery' | 'activity';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  value: string;
  expectedRange?: string;
}

/**
 * Actionable recommendation extracted from analysis
 */
export interface Recommendation {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  category: 'sleep' | 'stress' | 'activity' | 'recovery' | 'lifestyle';
  evidence: string;
  actionType: 'habit' | 'avoid' | 'timing' | 'goal';
  trackingType: 'daily' | 'weekly' | 'one-time' | null;
  suggestedDuration?: number;
}

/**
 * Pattern discovered in health data
 */
export interface Pattern {
  id: string;
  type: 'positive' | 'negative' | 'neutral';
  description: string;
  correlation?: string;
  frequency?: string;
}

/**
 * Daily insight for engagement
 */
export interface Insight {
  id: string;
  text: string;
  category: 'tip' | 'observation' | 'achievement' | 'warning';
  actionable: boolean;
  relatedRecommendationId?: string;
}

/**
 * Complete structured analysis from AI
 */
export interface StructuredAnalysis {
  version: '1.0';
  generatedAt: string;
  dateRange: { start: string; end: string };

  // Summary
  executiveSummary: string[];

  // Scores
  metrics: HealthMetrics;

  // Findings
  anomalies: Anomaly[];
  patterns: Pattern[];

  // Actions
  recommendations: Recommendation[];

  // Positives
  achievements: string[];

  // Engagement content
  insights: Insight[];
}

/**
 * Schema description for AI prompt
 */
export const STRUCTURED_ANALYSIS_SCHEMA = `{
  "version": "1.0",
  "generatedAt": "<ISO timestamp>",
  "dateRange": { "start": "<date>", "end": "<date>" },
  "executiveSummary": ["<bullet 1>", "<bullet 2>", "<bullet 3>"],
  "metrics": {
    "overallScore": <0-100>,
    "sleepScore": <0-100>,
    "stressScore": <0-100, higher=better>,
    "recoveryScore": <0-100>,
    "activityScore": <0-100>
  },
  "anomalies": [
    {
      "id": "<unique-id>",
      "date": "<YYYY-MM-DD>",
      "metric": "sleep|stress|heartRate|bodyBattery|activity",
      "severity": "info|warning|critical",
      "title": "<short title>",
      "description": "<explanation>",
      "value": "<observed value>",
      "expectedRange": "<normal range>"
    }
  ],
  "patterns": [
    {
      "id": "<unique-id>",
      "type": "positive|negative|neutral",
      "description": "<pattern description>",
      "correlation": "<cause → effect>",
      "frequency": "<how often>"
    }
  ],
  "recommendations": [
    {
      "id": "<unique-id>",
      "text": "<actionable recommendation>",
      "priority": "high|medium|low",
      "category": "sleep|stress|activity|recovery|lifestyle",
      "evidence": "<data that prompted this>",
      "actionType": "habit|avoid|timing|goal",
      "trackingType": "daily|weekly|one-time|null",
      "suggestedDuration": <days or null>
    }
  ],
  "achievements": ["<positive observation 1>", "<positive observation 2>"],
  "insights": [
    {
      "id": "<unique-id>",
      "text": "<bite-sized insight for daily tip>",
      "category": "tip|observation|achievement|warning",
      "actionable": true|false,
      "relatedRecommendationId": "<id or null>"
    }
  ]
}`;
