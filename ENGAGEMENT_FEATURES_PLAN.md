# Engagement Features Implementation Plan

## Executive Summary

Transform the ephemeral analysis report into a living health dashboard with persistent history, actionable tracking, trend visualization, and daily engagement touchpoints.

**Features to Implement:**
1. Structured Report Output (foundation)
2. Report Archive + History
3. Action Tracker
4. Trend Comparisons
5. Daily Insights

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI Layer                                 │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│ ReportHistory│ ActionTracker│  TrendView   │  DailyInsight     │
│   Component  │  Component   │  Component   │   Component       │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬──────────┘
       │              │              │                │
       ▼              ▼              ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Hooks Layer                                │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│useReportStore│useActionStore│ useTrends    │ useDailyInsight   │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬──────────┘
       │              │              │                │
       ▼              ▼              ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Storage Service (IndexedDB)                   │
├─────────────────────────────────────────────────────────────────┤
│  Tables: reports | actions | insights | metrics | userProgress  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Structured Report Output (Foundation)

### Goal
Modify the AI analysis to return structured JSON alongside markdown, enabling programmatic extraction of metrics, recommendations, and insights.

### 1.1 Define Structured Types

**File: `client/src/types/structured-analysis.ts`** (new)
**File: `server/src/types/structured-analysis.ts`** (new)

```typescript
// Health score components
interface HealthMetrics {
  overallScore: number;          // 0-100 aggregated health score
  sleepScore: number;            // 0-100
  stressScore: number;           // 0-100 (inverted - higher is better)
  recoveryScore: number;         // 0-100
  activityScore: number;         // 0-100
}

// Detected anomaly
interface Anomaly {
  id: string;
  date: string;
  metric: 'sleep' | 'stress' | 'heartRate' | 'bodyBattery' | 'activity';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  value: number | string;
  expectedRange?: string;
}

// Actionable recommendation
interface Recommendation {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  category: 'sleep' | 'stress' | 'activity' | 'recovery' | 'lifestyle';
  evidence: string;              // Data that prompted this
  actionType: 'habit' | 'avoid' | 'timing' | 'goal';
  trackingType: 'daily' | 'weekly' | 'one-time' | null;
  suggestedDuration?: number;    // Days to track
}

// Pattern discovered
interface Pattern {
  id: string;
  type: 'positive' | 'negative' | 'neutral';
  description: string;
  correlation?: string;          // e.g., "Late workouts → Poor sleep"
  frequency?: string;            // e.g., "3 of 7 days"
}

// Daily insight for engagement
interface Insight {
  id: string;
  text: string;
  category: 'tip' | 'observation' | 'achievement' | 'warning';
  actionable: boolean;
  relatedRecommendationId?: string;
}

// Complete structured analysis
interface StructuredAnalysis {
  version: '1.0';
  generatedAt: string;
  dateRange: { start: string; end: string };

  // Summary
  executiveSummary: string[];    // 3-5 TL;DR bullets

  // Scores
  metrics: HealthMetrics;

  // Findings
  anomalies: Anomaly[];
  patterns: Pattern[];

  // Actions
  recommendations: Recommendation[];

  // Positives
  achievements: string[];        // What's working well

  // Engagement content
  insights: Insight[];           // Derived insights for daily tips
}
```

### 1.2 Modify AI Prompt for Structured Output

**File: `server/src/services/llm/provider.interface.ts`**

Update `buildSystemPrompt()` to request JSON output:

```typescript
// Add to the end of the system prompt:
`
## Output Format

You MUST provide your response in TWO parts:

### Part 1: Markdown Analysis
[Your detailed markdown analysis as specified above]

### Part 2: Structured Data
After your markdown analysis, include a JSON block with structured data:

\`\`\`json:structured-analysis
{
  "version": "1.0",
  "metrics": {
    "overallScore": <0-100>,
    "sleepScore": <0-100>,
    "stressScore": <0-100>,
    "recoveryScore": <0-100>,
    "activityScore": <0-100>
  },
  "executiveSummary": ["bullet 1", "bullet 2", ...],
  "anomalies": [...],
  "patterns": [...],
  "recommendations": [...],
  "achievements": [...],
  "insights": [...]
}
\`\`\`

Ensure the JSON is valid and follows the schema exactly.
`
```

### 1.3 Parse Structured Response

**File: `server/src/services/llm/response-parser.ts`** (new)

```typescript
interface ParsedAnalysis {
  markdown: string;
  structured: StructuredAnalysis | null;
  parseError?: string;
}

function parseAnalysisResponse(rawResponse: string): ParsedAnalysis {
  // Extract JSON block from response
  const jsonMatch = rawResponse.match(/```json:structured-analysis\n([\s\S]*?)\n```/);

  // Extract markdown (everything before the JSON block)
  const markdown = rawResponse.replace(/```json:structured-analysis[\s\S]*?```/, '').trim();

  if (!jsonMatch) {
    return { markdown, structured: null, parseError: 'No structured data found' };
  }

  try {
    const structured = JSON.parse(jsonMatch[1]) as StructuredAnalysis;
    return { markdown, structured };
  } catch (e) {
    return { markdown, structured: null, parseError: `JSON parse error: ${e.message}` };
  }
}
```

### 1.4 Update Analysis Response Type

**File: `server/src/types/index.ts`** and **`client/src/types/index.ts`**

```typescript
interface AnalysisResponse {
  provider: LLMProvider;
  model: string;
  analysis: string;                    // Markdown content
  structured?: StructuredAnalysis;     // NEW: Parsed structured data
  tokensUsed?: number;
}
```

### 1.5 Update LLM Service

**File: `server/src/services/llm/llm.service.ts`**

```typescript
export async function analyzeHealthData(options: AnalyzeOptions): Promise<AnalysisResult> {
  // ... existing code ...

  const rawContent = result.text;
  const { markdown, structured, parseError } = parseAnalysisResponse(rawContent);

  if (parseError) {
    console.warn('Failed to parse structured analysis:', parseError);
  }

  return {
    content: markdown,
    structured,              // NEW
    model: modelId,
    provider,
    tokensUsed: result.usage?.totalTokens,
  };
}
```

---

## Phase 2: Storage Layer (IndexedDB)

### Goal
Create a robust client-side storage system using IndexedDB (via Dexie.js) to persist reports, actions, and user progress.

### 2.1 Install Dexie.js

```bash
cd client && yarn add dexie
```

### 2.2 Define Database Schema

**File: `client/src/db/schema.ts`** (new)

```typescript
import Dexie, { Table } from 'dexie';

// Saved report with full data
interface SavedReport {
  id: string;                          // UUID
  createdAt: string;                   // ISO timestamp
  dateRange: { start: string; end: string };
  provider: LLMProvider;
  model: string;
  markdown: string;                    // Full markdown analysis
  structured: StructuredAnalysis;      // Parsed structured data
  healthData: GarminHealthData;        // Original health data
  lifeContexts?: LifeContext[];        // Life context at time of report
}

// Tracked action item
interface TrackedAction {
  id: string;                          // UUID
  reportId: string;                    // Source report
  recommendation: Recommendation;       // Original recommendation
  status: 'active' | 'completed' | 'dismissed' | 'snoozed';
  createdAt: string;
  completedAt?: string;

  // Tracking data
  trackingHistory: {
    date: string;
    completed: boolean;
    notes?: string;
  }[];
  currentStreak: number;
  longestStreak: number;
}

// Daily insight queue
interface QueuedInsight {
  id: string;
  reportId: string;
  insight: Insight;
  scheduledFor: string;                // Date to show
  status: 'pending' | 'shown' | 'acted' | 'dismissed';
  shownAt?: string;
}

// Historical metrics for trends
interface MetricSnapshot {
  id: string;
  reportId: string;
  date: string;                        // Report date
  metrics: HealthMetrics;
}

// User progress and preferences
interface UserProgress {
  id: 'singleton';                     // Only one record
  lastReportId?: string;
  totalReports: number;
  actionsCompleted: number;
  currentStreaks: Record<string, number>;
  achievements: string[];
  insightPreferences: {
    lastShownDate: string;
    dismissedCategories: string[];
  };
}

class PulseLogicDB extends Dexie {
  reports!: Table<SavedReport>;
  actions!: Table<TrackedAction>;
  insights!: Table<QueuedInsight>;
  metrics!: Table<MetricSnapshot>;
  progress!: Table<UserProgress>;

  constructor() {
    super('PulseLogicDB');

    this.version(1).stores({
      reports: 'id, createdAt, [dateRange.start], [dateRange.end]',
      actions: 'id, reportId, status, [recommendation.priority]',
      insights: 'id, reportId, scheduledFor, status',
      metrics: 'id, reportId, date',
      progress: 'id',
    });
  }
}

export const db = new PulseLogicDB();
```

### 2.3 Create Storage Service

**File: `client/src/services/storage.service.ts`** (new)

```typescript
import { db, SavedReport, TrackedAction, QueuedInsight, MetricSnapshot } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';

export const StorageService = {
  // === Reports ===
  async saveReport(report: Omit<SavedReport, 'id' | 'createdAt'>): Promise<string> {
    const id = uuidv4();
    const savedReport: SavedReport = {
      ...report,
      id,
      createdAt: new Date().toISOString(),
    };
    await db.reports.add(savedReport);

    // Also save metrics snapshot and queue insights
    await this.saveMetricSnapshot(id, report.structured.metrics, report.dateRange.end);
    await this.queueInsights(id, report.structured.insights);

    return id;
  },

  async getReports(limit = 20): Promise<SavedReport[]> {
    return db.reports.orderBy('createdAt').reverse().limit(limit).toArray();
  },

  async getReport(id: string): Promise<SavedReport | undefined> {
    return db.reports.get(id);
  },

  async deleteReport(id: string): Promise<void> {
    await db.reports.delete(id);
    await db.actions.where('reportId').equals(id).delete();
    await db.insights.where('reportId').equals(id).delete();
    await db.metrics.where('reportId').equals(id).delete();
  },

  // === Actions ===
  async createActionsFromReport(reportId: string, recommendations: Recommendation[]): Promise<void> {
    const actions: TrackedAction[] = recommendations
      .filter(r => r.trackingType)  // Only trackable items
      .map(r => ({
        id: uuidv4(),
        reportId,
        recommendation: r,
        status: 'active',
        createdAt: new Date().toISOString(),
        trackingHistory: [],
        currentStreak: 0,
        longestStreak: 0,
      }));

    await db.actions.bulkAdd(actions);
  },

  async getActiveActions(): Promise<TrackedAction[]> {
    return db.actions.where('status').equals('active').toArray();
  },

  async logActionProgress(actionId: string, completed: boolean, notes?: string): Promise<void> {
    const action = await db.actions.get(actionId);
    if (!action) return;

    const today = new Date().toISOString().split('T')[0];
    const entry = { date: today, completed, notes };

    // Update streak
    let newStreak = completed ? action.currentStreak + 1 : 0;
    let longestStreak = Math.max(action.longestStreak, newStreak);

    await db.actions.update(actionId, {
      trackingHistory: [...action.trackingHistory, entry],
      currentStreak: newStreak,
      longestStreak,
    });
  },

  async completeAction(actionId: string): Promise<void> {
    await db.actions.update(actionId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
  },

  // === Insights ===
  async queueInsights(reportId: string, insights: Insight[]): Promise<void> {
    const startDate = new Date();

    const queued: QueuedInsight[] = insights.map((insight, index) => ({
      id: uuidv4(),
      reportId,
      insight,
      scheduledFor: new Date(startDate.getTime() + index * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0],
      status: 'pending',
    }));

    await db.insights.bulkAdd(queued);
  },

  async getTodayInsight(): Promise<QueuedInsight | null> {
    const today = new Date().toISOString().split('T')[0];

    // Get pending insight for today or earlier
    const insight = await db.insights
      .where('scheduledFor')
      .belowOrEqual(today)
      .and(i => i.status === 'pending')
      .first();

    return insight || null;
  },

  async markInsightShown(id: string): Promise<void> {
    await db.insights.update(id, {
      status: 'shown',
      shownAt: new Date().toISOString(),
    });
  },

  // === Metrics / Trends ===
  async saveMetricSnapshot(reportId: string, metrics: HealthMetrics, date: string): Promise<void> {
    await db.metrics.add({
      id: uuidv4(),
      reportId,
      date,
      metrics,
    });
  },

  async getMetricHistory(limit = 10): Promise<MetricSnapshot[]> {
    return db.metrics.orderBy('date').reverse().limit(limit).toArray();
  },

  // === Progress ===
  async getProgress(): Promise<UserProgress> {
    let progress = await db.progress.get('singleton');
    if (!progress) {
      progress = {
        id: 'singleton',
        totalReports: 0,
        actionsCompleted: 0,
        currentStreaks: {},
        achievements: [],
        insightPreferences: {
          lastShownDate: '',
          dismissedCategories: [],
        },
      };
      await db.progress.add(progress);
    }
    return progress;
  },

  async incrementReportCount(): Promise<void> {
    const progress = await this.getProgress();
    await db.progress.update('singleton', {
      totalReports: progress.totalReports + 1,
    });
  },
};
```

### 2.4 Create React Hooks for Storage

**File: `client/src/hooks/useReportStore.ts`** (new)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StorageService } from '../services/storage.service';

export function useReportHistory() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: () => StorageService.getReports(),
  });
}

export function useReport(id: string) {
  return useQuery({
    queryKey: ['report', id],
    queryFn: () => StorageService.getReport(id),
    enabled: !!id,
  });
}

export function useSaveReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: StorageService.saveReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: StorageService.deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
```

**File: `client/src/hooks/useActionTracker.ts`** (new)

```typescript
export function useActiveActions() {
  return useQuery({
    queryKey: ['actions', 'active'],
    queryFn: () => StorageService.getActiveActions(),
  });
}

export function useLogActionProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ actionId, completed, notes }: {
      actionId: string;
      completed: boolean;
      notes?: string
    }) => StorageService.logActionProgress(actionId, completed, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
    },
  });
}

export function useCompleteAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: StorageService.completeAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
    },
  });
}
```

**File: `client/src/hooks/useTrends.ts`** (new)

```typescript
export function useMetricHistory() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: () => StorageService.getMetricHistory(),
  });
}

export function useTrendComparison() {
  const { data: history } = useMetricHistory();

  if (!history || history.length < 2) {
    return { hasTrend: false, current: null, previous: null, deltas: null };
  }

  const [current, previous] = history;

  const deltas = {
    overallScore: current.metrics.overallScore - previous.metrics.overallScore,
    sleepScore: current.metrics.sleepScore - previous.metrics.sleepScore,
    stressScore: current.metrics.stressScore - previous.metrics.stressScore,
    recoveryScore: current.metrics.recoveryScore - previous.metrics.recoveryScore,
    activityScore: current.metrics.activityScore - previous.metrics.activityScore,
  };

  return { hasTrend: true, current, previous, deltas };
}
```

**File: `client/src/hooks/useDailyInsight.ts`** (new)

```typescript
export function useDailyInsight() {
  return useQuery({
    queryKey: ['insight', 'today'],
    queryFn: () => StorageService.getTodayInsight(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useDismissInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: StorageService.markInsightShown,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insight'] });
    },
  });
}
```

---

## Phase 3: Report Archive + History

### Goal
Auto-save analysis reports and provide a browsable history interface.

### 3.1 Auto-Save on Analysis Complete

**File: `client/src/pages/AnalysisStep.tsx`**

Modify `handleAnalyze` to save report after successful analysis:

```typescript
import { useSaveReport } from '../hooks/useReportStore';

// Inside component:
const saveReport = useSaveReport();

const handleAnalyze = async () => {
  // ... existing code ...

  try {
    const result = await analysisMutation.mutateAsync({...});
    setAnalysis(result);

    // NEW: Auto-save report if structured data available
    if (result.structured) {
      await saveReport.mutateAsync({
        dateRange: healthData.dateRange,
        provider: activeProvider,
        model: activeModel,
        markdown: result.analysis,
        structured: result.structured,
        healthData,
        lifeContexts: lifeContexts.length > 0 ? lifeContexts : undefined,
      });
    }
  } catch {
    // Error handled by mutation
  }
};
```

### 3.2 Create ReportHistory Component

**File: `client/src/components/ReportHistory.tsx`** (new)

```typescript
interface ReportHistoryProps {
  onSelectReport: (id: string) => void;
}

export function ReportHistory({ onSelectReport }: ReportHistoryProps) {
  const { data: reports, isLoading } = useReportHistory();
  const deleteReport = useDeleteReport();

  // Renders:
  // - List of reports with date, health score, key highlights
  // - Click to view full report
  // - Delete button (with confirmation)
  // - "No reports yet" empty state
}
```

### 3.3 Create ReportDetail Component

**File: `client/src/components/ReportDetail.tsx`** (new)

```typescript
interface ReportDetailProps {
  reportId: string;
  onBack: () => void;
}

export function ReportDetail({ reportId, onBack }: ReportDetailProps) {
  const { data: report, isLoading } = useReport(reportId);

  // Renders:
  // - Full markdown analysis
  // - Health metrics summary card
  // - Action items list (can add to tracker)
  // - "Run new analysis with same data" button
}
```

### 3.4 Add History Tab to UI

**File: `client/src/pages/AnalysisStep.tsx`** or create new page

Add a tab or section to switch between:
- Current Analysis
- Report History
- Action Tracker
- Trends

---

## Phase 4: Action Tracker

### Goal
Convert recommendations into a trackable checklist with streaks and progress.

### 4.1 Create ActionTracker Component

**File: `client/src/components/ActionTracker.tsx`** (new)

```typescript
export function ActionTracker() {
  const { data: actions, isLoading } = useActiveActions();
  const logProgress = useLogActionProgress();
  const completeAction = useCompleteAction();

  // Group actions by priority
  const grouped = useMemo(() => ({
    high: actions?.filter(a => a.recommendation.priority === 'high') || [],
    medium: actions?.filter(a => a.recommendation.priority === 'medium') || [],
    low: actions?.filter(a => a.recommendation.priority === 'low') || [],
  }), [actions]);

  // Renders:
  // - Priority sections (High/Medium/Low)
  // - Each action shows:
  //   - Recommendation text
  //   - Evidence that prompted it
  //   - Today's checkbox
  //   - Streak counter (🔥 4 days)
  //   - Progress bar (if has duration)
  //   - "Mark complete" / "Dismiss" buttons
}
```

### 4.2 Create ActionCard Component

**File: `client/src/components/ActionCard.tsx`** (new)

```typescript
interface ActionCardProps {
  action: TrackedAction;
  onLogToday: (completed: boolean, notes?: string) => void;
  onComplete: () => void;
  onDismiss: () => void;
}

export function ActionCard({ action, onLogToday, onComplete, onDismiss }: ActionCardProps) {
  // Shows:
  // - Icon based on category (sleep 😴, stress 🧘, activity 🏃, etc.)
  // - Recommendation text
  // - "Based on: {evidence}" subtitle
  // - Today's tracking: checkbox + optional notes
  // - Streak: "🔥 4 days" or "Start your streak!"
  // - Weekly progress: ○○●●●○○ (last 7 days)
  // - Actions: Complete | Snooze | Dismiss
}
```

### 4.3 Integrate with Analysis

When a new report is generated:
1. Extract trackable recommendations
2. Show prompt: "We found X actionable recommendations. Track them?"
3. User selects which to track
4. Create TrackedAction entries

---

## Phase 5: Trend Comparisons

### Goal
Visualize how health metrics change over time across multiple reports.

### 5.1 Create TrendComparison Component

**File: `client/src/components/TrendComparison.tsx`** (new)

```typescript
export function TrendComparison() {
  const { hasTrend, current, previous, deltas } = useTrendComparison();

  if (!hasTrend) {
    return <EmptyTrendState />;
  }

  // Renders:
  // - "Compared to your last analysis (X days ago)"
  // - Metric bars with delta indicators:
  //   - Sleep Score    ████████░░ 78 → 82  (+4) ↑
  //   - Stress Score   ██████░░░░ 65 → 72  (+7) ↑ Great!
  //   - Recovery       ████░░░░░░ 60 → 55  (-5) ↓ Needs attention
  // - Highlight biggest improvement
  // - Highlight area needing attention
}
```

### 5.2 Create MetricDelta Component

**File: `client/src/components/MetricDelta.tsx`** (new)

```typescript
interface MetricDeltaProps {
  label: string;
  current: number;
  previous: number;
  higherIsBetter?: boolean;
}

export function MetricDelta({ label, current, previous, higherIsBetter = true }: MetricDeltaProps) {
  const delta = current - previous;
  const isImprovement = higherIsBetter ? delta > 0 : delta < 0;

  // Renders:
  // - Label
  // - Progress bar showing current value
  // - Delta badge: "+4 ↑" (green) or "-3 ↓" (red)
  // - Contextual message for large changes
}
```

### 5.3 Create TrendChart Component (Optional Enhancement)

**File: `client/src/components/TrendChart.tsx`** (new)

Simple sparkline or line chart showing metric over last N reports.

---

## Phase 6: Daily Insights

### Goal
Surface one insight per day to create a reason to return.

### 6.1 Create DailyInsightCard Component

**File: `client/src/components/DailyInsightCard.tsx`** (new)

```typescript
export function DailyInsightCard() {
  const { data: insight, isLoading } = useDailyInsight();
  const dismissInsight = useDismissInsight();

  if (!insight) {
    return null; // Or "No insights yet" if no reports
  }

  // Renders:
  // - "💡 Today's Insight" header
  // - Insight text
  // - Category badge (tip, observation, achievement, warning)
  // - Action buttons:
  //   - [Try it today] - adds to action tracker
  //   - [See the data] - navigates to related report
  //   - [Dismiss] - marks as shown
}
```

### 6.2 Show on App Load

Display the DailyInsightCard prominently when user opens the app:
- Could be a modal on first load
- Or a pinned card at top of main view
- Dismissible but memorable

---

## File Structure Summary

```
client/src/
├── db/
│   └── schema.ts                    # IndexedDB schema with Dexie
├── services/
│   ├── api.ts                       # (existing, minor updates)
│   └── storage.service.ts           # NEW: IndexedDB operations
├── hooks/
│   ├── useAnalysis.ts               # (existing, minor updates)
│   ├── useReportStore.ts            # NEW: Report CRUD hooks
│   ├── useActionTracker.ts          # NEW: Action tracking hooks
│   ├── useTrends.ts                 # NEW: Trend comparison hooks
│   └── useDailyInsight.ts           # NEW: Daily insight hooks
├── components/
│   ├── ReportHistory.tsx            # NEW: Report list
│   ├── ReportDetail.tsx             # NEW: Single report view
│   ├── ActionTracker.tsx            # NEW: Action list
│   ├── ActionCard.tsx               # NEW: Single action
│   ├── TrendComparison.tsx          # NEW: Metric trends
│   ├── MetricDelta.tsx              # NEW: Single metric comparison
│   ├── DailyInsightCard.tsx         # NEW: Today's insight
│   └── ...existing components
├── types/
│   ├── index.ts                     # (existing, add new types)
│   └── structured-analysis.ts       # NEW: Structured report types
└── pages/
    └── AnalysisStep.tsx             # (existing, integrate new features)

server/src/
├── services/llm/
│   ├── provider.interface.ts        # Update prompt for structured output
│   ├── response-parser.ts           # NEW: Parse structured response
│   └── llm.service.ts               # Update to return structured data
└── types/
    ├── index.ts                     # Update AnalysisResponse
    └── structured-analysis.ts       # NEW: Server-side types
```

---

## Implementation Checklist

### Phase 1: Structured Report Output
- [ ] Create `structured-analysis.ts` types (client + server)
- [ ] Update `buildSystemPrompt()` for JSON output
- [ ] Create `response-parser.ts`
- [ ] Update `llm.service.ts` to parse and return structured data
- [ ] Update `AnalysisResponse` type
- [ ] Test structured output with all providers

### Phase 2: Storage Layer
- [ ] Install Dexie.js: `yarn add dexie`
- [ ] Create `db/schema.ts` with database definition
- [ ] Create `storage.service.ts` with CRUD operations
- [ ] Create React hooks for storage access
- [ ] Test storage operations

### Phase 3: Report Archive
- [ ] Modify `AnalysisStep` to auto-save reports
- [ ] Create `ReportHistory` component
- [ ] Create `ReportDetail` component
- [ ] Add navigation between current/history views
- [ ] Add delete functionality with confirmation

### Phase 4: Action Tracker
- [ ] Create `ActionTracker` component
- [ ] Create `ActionCard` component
- [ ] Add "Track recommendations" prompt after analysis
- [ ] Implement daily check-in for active actions
- [ ] Implement streak tracking

### Phase 5: Trend Comparisons
- [ ] Create `TrendComparison` component
- [ ] Create `MetricDelta` component
- [ ] Show trends after analysis (if previous exists)
- [ ] Add trend view to navigation

### Phase 6: Daily Insights
- [ ] Create `DailyInsightCard` component
- [ ] Show on app load
- [ ] Implement dismiss/act functionality
- [ ] Queue new insights when reports generated

---

## Testing Strategy

1. **Unit Tests**: Storage service operations
2. **Integration Tests**: Full flow from analysis → save → retrieve
3. **Manual Testing**:
   - Generate multiple reports over days
   - Track actions and verify streaks
   - Verify insights rotate daily

---

## Future Enhancements (Post-MVP)

1. **Dashboard Widgets**: Visual cards from structured metrics
2. **Experiment Mode**: Guided behavior change tracking
3. **Export**: PDF/CSV export of reports and progress
4. **Notifications**: Browser notifications for daily insights
5. **Cross-device Sync**: Backend storage option
6. **Sharing**: Share achievements or progress
