import { useState, useMemo } from 'react';
import {
  Download,
  Moon,
  Heart,
  Activity,
  Battery,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { useGarminData } from '../hooks';
import { Alert } from '../components/Alert';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { DailyInsight } from '../components/DailyInsight';
import { QuickDailyInsight } from '../components/QuickDailyInsight';
import { ActionTracker } from '../components/ActionTracker';
import { TrendComparison } from '../components/TrendComparison';
import { useSubscription } from '../contexts/SubscriptionContext';
import type { GarminHealthData } from '../types';

const DATA_DAY_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 180, label: '180 days' },
  { value: 360, label: '360 days' },
] as const;

interface DataStepProps {
  onComplete: (data: GarminHealthData) => void;
  onBack: () => void;
  userId: string;
  preferAdvancedModel?: boolean;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function DataStep({ onComplete, onBack, userId }: DataStepProps) {
  const { maxDataDays, tier } = useSubscription();
  const [days, setDays] = useState(Math.min(7, maxDataDays));
  const fetchMutation = useGarminData(days);

  // Build options based on tier limits
  const availableOptions = useMemo(() => {
    return DATA_DAY_OPTIONS.map((opt) => ({
      ...opt,
      locked: opt.value > maxDataDays,
    }));
  }, [maxDataDays]);

  const handleFetch = async () => {
    try {
      await fetchMutation.mutateAsync();
      // Don't auto-advance, let user review data first
    } catch {
      // Error handled by mutation
    }
  };

  const data = fetchMutation.data;

  return (
    <div className="space-y-6">
      {/* Daily Insight from saved reports */}
      <DailyInsight />

      {/* Engagement Widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActionTracker compact />
        <TrendComparison compact />
      </div>

      {/* Fetch Controls */}
      <div className={`card relative ${fetchMutation.isPending ? 'pointer-events-none' : ''}`}>
        <LoadingOverlay isLoading={fetchMutation.isPending} type="fetching" />
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-5 h-5 text-garmin-blue" />
          <h2 className="text-lg font-semibold">Fetch Health Data</h2>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm">Fetch data for the last</label>
          <select
            className="input-field w-40"
            value={days}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value <= maxDataDays) {
                setDays(value);
              }
            }}
          >
            {availableOptions.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.locked}
              >
                {opt.label}{opt.locked ? ' 🔒' : ''}
              </option>
            ))}
          </select>
        </div>

        {maxDataDays < 360 && tier === 'free' && (
          <p className="text-xs text-slate-400 mb-4">
            Upgrade to paid plan for up to 360 days of data history.
          </p>
        )}

        {fetchMutation.isError && (
          <div className="space-y-3">
            <Alert
              type="error"
              message={fetchMutation.error?.message || 'Failed to fetch data'}
            />
            {fetchMutation.error?.message?.includes('session') ||
             fetchMutation.error?.message?.includes('login') ||
             fetchMutation.error?.message?.includes('authenticated') ? (
              <p className="text-sm text-slate-400">
                Your Garmin session has expired. Please logout and login again.
              </p>
            ) : null}
          </div>
        )}

        <button
          className="btn-primary w-full flex items-center justify-center gap-2"
          onClick={handleFetch}
          disabled={fetchMutation.isPending}
        >
          <Download className="w-4 h-4" />
          {data ? 'Refresh Data' : 'Fetch Data'}
        </button>
      </div>

      {/* Data Preview */}
      {data && (
        <div className="space-y-4">
          {/* Quick Daily Insight - LLM-generated comparison of last day vs averages */}
          <QuickDailyInsight healthData={data} userId={userId} />

          <h3 className="text-lg font-semibold">
            Data Retrieved: {data.dateRange.start} to {data.dateRange.end}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sleep Summary */}
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <Moon className="w-5 h-5 text-indigo-400" />
                <h4 className="font-medium">Sleep ({data.sleep.length} nights)</h4>
              </div>
              {data.sleep.length > 0 ? (
                <div className="space-y-2 text-sm">
                  {data.sleep.slice(0, 3).map(s => (
                    <div key={s.date} className="flex justify-between text-slate-300">
                      <span>{s.date}</span>
                      <span>{formatDuration(s.sleepTimeSeconds)}</span>
                      {s.sleepScore && <span className="text-indigo-400">{s.sleepScore} pts</span>}
                    </div>
                  ))}
                  {data.sleep.length > 3 && (
                    <p className="text-slate-500">+{data.sleep.length - 3} more nights</p>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No sleep data available</p>
              )}
            </div>

            {/* Heart Rate Summary */}
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-5 h-5 text-red-400" />
                <h4 className="font-medium">Heart Rate ({data.heartRate.length} days)</h4>
              </div>
              {data.heartRate.length > 0 ? (
                <div className="space-y-2 text-sm">
                  {data.heartRate.slice(0, 3).map(hr => (
                    <div key={hr.date} className="flex justify-between text-slate-300">
                      <span>{hr.date}</span>
                      <span>Resting: {hr.restingHeartRate} bpm</span>
                    </div>
                  ))}
                  {data.heartRate.length > 3 && (
                    <p className="text-slate-500">+{data.heartRate.length - 3} more days</p>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No heart rate data available</p>
              )}
            </div>

            {/* Activities Summary */}
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-green-400" />
                <h4 className="font-medium">Activities ({data.activities.length})</h4>
              </div>
              {data.activities.length > 0 ? (
                <div className="space-y-2 text-sm">
                  {data.activities.slice(0, 3).map(a => (
                    <div key={a.activityId} className="flex justify-between text-slate-300">
                      <span className="truncate max-w-[150px]">{a.activityName}</span>
                      <span>{formatDuration(a.duration)}</span>
                    </div>
                  ))}
                  {data.activities.length > 3 && (
                    <p className="text-slate-500">+{data.activities.length - 3} more activities</p>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No activities recorded</p>
              )}
            </div>

            {/* Body Battery Summary */}
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <Battery className="w-5 h-5 text-yellow-400" />
                <h4 className="font-medium">Body Battery ({data.bodyBattery.length} days)</h4>
              </div>
              {data.bodyBattery.length > 0 ? (
                <div className="space-y-2 text-sm">
                  {data.bodyBattery.slice(0, 3).map(bb => (
                    <div key={bb.date} className="flex justify-between text-slate-300">
                      <span>{bb.date}</span>
                      <span>
                        {bb.lowestLevel}% → {bb.highestLevel}%
                      </span>
                    </div>
                  ))}
                  {data.bodyBattery.length > 3 && (
                    <p className="text-slate-500">+{data.bodyBattery.length - 3} more days</p>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No body battery data available</p>
              )}
            </div>

            {/* Stress Summary */}
            <div className="card md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                <h4 className="font-medium">Stress Levels ({data.stress.length} days)</h4>
              </div>
              {data.stress.length > 0 ? (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {data.stress.slice(0, 3).map(s => (
                    <div key={s.date} className="text-slate-300">
                      <span className="block font-medium">{s.date}</span>
                      <span>Overall: {s.overallStressLevel}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No stress data available</p>
              )}
            </div>
          </div>

          {/* Continue Button */}
          <button
            className="btn-primary w-full text-lg py-3 flex items-center justify-center gap-2"
            onClick={() => onComplete(data)}
          >
            Continue to AI Analysis
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Logout Button */}
      <button className="btn-secondary w-full" onClick={onBack}>
        Logout
      </button>
    </div>
  );
}
