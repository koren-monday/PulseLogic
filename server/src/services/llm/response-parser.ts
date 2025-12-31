import type { StructuredAnalysis } from '../../types/index.js';

export interface ParsedAnalysis {
  markdown: string;
  structured: StructuredAnalysis | null;
  parseError?: string;
}

/**
 * Parse the AI response to extract markdown and structured JSON data.
 * The AI is instructed to include a JSON block labeled `json:structured-analysis`.
 */
export function parseAnalysisResponse(rawResponse: string): ParsedAnalysis {
  // Pattern to match the structured analysis JSON block
  const jsonPattern = /```json:structured-analysis\s*([\s\S]*?)\s*```/;
  const jsonMatch = rawResponse.match(jsonPattern);

  // Extract markdown by removing the JSON block
  const markdown = rawResponse.replace(jsonPattern, '').trim();

  if (!jsonMatch || !jsonMatch[1]) {
    console.warn('No structured analysis block found in AI response');
    return {
      markdown,
      structured: null,
      parseError: 'No structured analysis block found in response',
    };
  }

  try {
    const jsonString = jsonMatch[1].trim();
    const structured = JSON.parse(jsonString) as StructuredAnalysis;

    // Validate required fields
    if (!structured.version || !structured.metrics || !structured.executiveSummary) {
      return {
        markdown,
        structured: null,
        parseError: 'Structured analysis missing required fields',
      };
    }

    // Ensure version is correct
    if (structured.version !== '1.0') {
      console.warn(`Unexpected structured analysis version: ${structured.version}`);
    }

    // Validate metrics are within range
    const { metrics } = structured;
    const metricsValid = [
      metrics.overallScore,
      metrics.sleepScore,
      metrics.stressScore,
      metrics.recoveryScore,
      metrics.activityScore,
    ].every((score) => typeof score === 'number' && score >= 0 && score <= 100);

    if (!metricsValid) {
      console.warn('Some metrics are out of valid range (0-100)');
    }

    // Ensure arrays exist (default to empty if missing)
    structured.anomalies = structured.anomalies || [];
    structured.patterns = structured.patterns || [];
    structured.recommendations = structured.recommendations || [];
    structured.achievements = structured.achievements || [];
    structured.insights = structured.insights || [];

    return {
      markdown,
      structured,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to parse structured analysis JSON:', errorMessage);

    return {
      markdown,
      structured: null,
      parseError: `JSON parse error: ${errorMessage}`,
    };
  }
}

/**
 * Create a fallback structured analysis when AI fails to provide one.
 * This generates minimal data from the markdown content.
 */
export function createFallbackStructuredAnalysis(
  dateRange: { start: string; end: string }
): StructuredAnalysis {
  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    dateRange,
    executiveSummary: ['Analysis complete. Structured data unavailable.'],
    metrics: {
      overallScore: 0,
      sleepScore: 0,
      stressScore: 0,
      recoveryScore: 0,
      activityScore: 0,
    },
    anomalies: [],
    patterns: [],
    recommendations: [],
    achievements: [],
    insights: [],
  };
}
