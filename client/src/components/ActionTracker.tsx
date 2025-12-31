import { useState } from 'react';
import { Target, Filter, ChevronLeft } from 'lucide-react';
import {
  useActiveActions,
  useAllActions,
  useLogActionProgress,
  useCompleteAction,
  useDismissAction,
  useSnoozeAction,
  useReactivateAction,
} from '../hooks';
import { LoadingSpinner } from './LoadingSpinner';
import { ActionCard } from './ActionCard';

type FilterType = 'active' | 'all' | 'completed' | 'dismissed';

interface ActionTrackerProps {
  onClose?: () => void;
  compact?: boolean;
}

export function ActionTracker({ onClose, compact = false }: ActionTrackerProps) {
  const [filter, setFilter] = useState<FilterType>('active');

  const { data: activeActions, isLoading: activeLoading } = useActiveActions();
  const { data: allActions, isLoading: allLoading } = useAllActions();

  const logProgressMutation = useLogActionProgress();
  const completeMutation = useCompleteAction();
  const dismissMutation = useDismissAction();
  const snoozeMutation = useSnoozeAction();
  const reactivateMutation = useReactivateAction();

  const isLoading = activeLoading || allLoading;

  // Filter actions based on selected filter
  const filteredActions = (() => {
    if (!allActions) return [];

    switch (filter) {
      case 'active':
        return allActions.filter(a => a.status === 'active');
      case 'completed':
        return allActions.filter(a => a.status === 'completed');
      case 'dismissed':
        return allActions.filter(a => a.status === 'dismissed' || a.status === 'snoozed');
      case 'all':
      default:
        return allActions;
    }
  })();

  // Count today's completed actions
  const today = new Date().toISOString().split('T')[0];
  const completedToday = (activeActions || []).filter(a =>
    a.trackingHistory.some(h => h.date === today && h.completed)
  ).length;
  const totalActive = (activeActions || []).length;

  const handleLogProgress = (actionId: string, completed: boolean, notes?: string) => {
    logProgressMutation.mutate({ actionId, completed, notes });
  };

  const handleComplete = (actionId: string) => {
    completeMutation.mutate(actionId);
  };

  const handleDismiss = (actionId: string) => {
    dismissMutation.mutate(actionId);
  };

  const handleSnooze = (actionId: string) => {
    snoozeMutation.mutate(actionId);
  };

  const handleReactivate = (actionId: string) => {
    reactivateMutation.mutate(actionId);
  };

  if (isLoading) {
    return (
      <div className="card">
        <LoadingSpinner size="sm" message="Loading actions..." />
      </div>
    );
  }

  if (compact) {
    // Compact view for sidebar/widget
    const activeCount = (activeActions || []).length;

    if (activeCount === 0) {
      return (
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-garmin-blue" />
            <h3 className="font-semibold">Action Tracker</h3>
          </div>
          <p className="text-slate-400 text-sm">
            No active actions. Generate an analysis to get personalized recommendations.
          </p>
        </div>
      );
    }

    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-garmin-blue" />
            <h3 className="font-semibold">Action Tracker</h3>
          </div>
          <div className="text-sm">
            <span className="text-green-400 font-semibold">{completedToday}</span>
            <span className="text-slate-400">/{totalActive} today</span>
          </div>
        </div>

        <div className="space-y-2">
          {(activeActions || []).slice(0, 3).map(action => (
            <ActionCard
              key={action.id}
              action={action}
              onLogProgress={handleLogProgress}
              onComplete={handleComplete}
              onDismiss={handleDismiss}
              onSnooze={handleSnooze}
              onReactivate={handleReactivate}
            />
          ))}
        </div>

        {activeCount > 3 && (
          <button className="w-full mt-3 text-sm text-garmin-blue hover:text-garmin-light-blue transition-colors">
            View all {activeCount} actions...
          </button>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
          )}
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-garmin-blue" />
            <h2 className="text-lg font-semibold">Action Tracker</h2>
          </div>
          <div className="text-sm">
            <span className="text-green-400 font-semibold">{completedToday}</span>
            <span className="text-slate-400">/{totalActive} today</span>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          {(['active', 'completed', 'dismissed', 'all'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-3 py-1 rounded text-sm transition-colors capitalize
                ${filter === f
                  ? 'bg-garmin-blue text-white'
                  : 'bg-slate-700 text-slate-400 hover:text-white'}
              `}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Actions list */}
      {filteredActions.length === 0 ? (
        <div className="card text-center py-8">
          <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">
            {filter === 'active'
              ? 'No active actions. Generate an analysis to get personalized recommendations.'
              : `No ${filter} actions found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActions.map(action => (
            <ActionCard
              key={action.id}
              action={action}
              onLogProgress={handleLogProgress}
              onComplete={handleComplete}
              onDismiss={handleDismiss}
              onSnooze={handleSnooze}
              onReactivate={handleReactivate}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {totalActive > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Today's Progress</span>
            <span className="text-sm font-semibold text-white">
              {Math.round((completedToday / totalActive) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-garmin-blue to-green-400 transition-all duration-500"
              style={{ width: `${(completedToday / totalActive) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
