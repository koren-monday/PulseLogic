// ============================================================================
// Structured Analysis Types (Server)
// These types define the parsed, structured output from AI health analysis
// ============================================================================

export interface HealthMetrics {
  overallScore: number;
  sleepScore: number;
  stressScore: number;
  recoveryScore: number;
  activityScore: number;
}

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

export interface Pattern {
  id: string;
  type: 'positive' | 'negative' | 'neutral';
  description: string;
  correlation?: string;
  frequency?: string;
}

export interface Insight {
  id: string;
  text: string;
  category: 'tip' | 'observation' | 'achievement' | 'warning';
  actionable: boolean;
  relatedRecommendationId?: string;
}

export interface StructuredAnalysis {
  version: '1.0';
  generatedAt: string;
  dateRange: { start: string; end: string };
  executiveSummary: string[];
  metrics: HealthMetrics;
  anomalies: Anomaly[];
  patterns: Pattern[];
  recommendations: Recommendation[];
  achievements: string[];
  insights: Insight[];
}
