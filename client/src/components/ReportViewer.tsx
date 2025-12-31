import { ChevronLeft, Calendar, Bot, Copy, Check, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useDeleteReport } from '../hooks';
import { ScoreCard } from './ScoreCard';
import type { SavedReport } from '../db/schema';

interface ReportViewerProps {
  report: SavedReport;
  onClose: () => void;
}

export function ReportViewer({ report, onClose }: ReportViewerProps) {
  const [copied, setCopied] = useState(false);
  const deleteMutation = useDeleteReport();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(report.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (confirm('Delete this report? This action cannot be undone.')) {
      await deleteMutation.mutateAsync(report.id);
      onClose();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to History
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-slate-400" />
              )}
            </button>
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-red-400"
              title="Delete report"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-garmin-blue" />
          <div>
            <div className="font-semibold text-white">
              {formatDate(report.dateRange.start)} - {formatDate(report.dateRange.end)}
            </div>
            <div className="text-xs text-slate-400">
              Generated on {new Date(report.createdAt).toLocaleDateString()} with {report.model}
            </div>
          </div>
        </div>

        {/* Life Contexts */}
        {report.lifeContexts && report.lifeContexts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="text-xs text-slate-400 mb-2">Life Context</div>
            <div className="flex flex-wrap gap-2">
              {report.lifeContexts.map((ctx, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded"
                >
                  {ctx.type.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Score Cards */}
      {report.structured && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <ScoreCard
            label="Overall"
            score={report.structured.metrics.overallScore}
            isPrimary
          />
          <ScoreCard
            label="Sleep"
            score={report.structured.metrics.sleepScore}
          />
          <ScoreCard
            label="Stress"
            score={report.structured.metrics.stressScore}
          />
          <ScoreCard
            label="Recovery"
            score={report.structured.metrics.recoveryScore}
          />
          <ScoreCard
            label="Activity"
            score={report.structured.metrics.activityScore}
          />
        </div>
      )}

      {/* Achievements */}
      {report.structured?.achievements && report.structured.achievements.length > 0 && (
        <div className="card">
          <h4 className="text-sm font-medium text-slate-400 mb-3">Achievements</h4>
          <div className="flex flex-wrap gap-2">
            {report.structured.achievements.map((achievement, idx) => (
              <span
                key={idx}
                className="text-sm bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-full"
              >
                {achievement}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Content */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-5 h-5 text-garmin-blue" />
          <h3 className="font-semibold">Analysis</h3>
        </div>

        <div
          className="prose prose-invert prose-sm max-w-none leading-relaxed whitespace-pre-wrap text-slate-300"
          dangerouslySetInnerHTML={{
            __html: report.markdown
              .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>')
              .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-white mt-6 mb-3">$1</h2>')
              .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mt-6 mb-4">$1</h1>')
              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
              .replace(/^\- (.*$)/gm, '<li class="ml-4">$1</li>')
              .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>'),
          }}
        />
      </div>

      {/* Recommendations Summary */}
      {report.structured?.recommendations && report.structured.recommendations.length > 0 && (
        <div className="card">
          <h4 className="text-sm font-medium text-slate-400 mb-3">
            Recommendations ({report.structured.recommendations.length})
          </h4>
          <div className="space-y-2">
            {report.structured.recommendations.slice(0, 5).map((rec, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg"
              >
                <div
                  className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${rec.priority === 'high'
                      ? 'bg-red-500/20 text-red-400'
                      : rec.priority === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-green-500/20 text-green-400'}
                  `}
                >
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white">{rec.text}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{rec.evidence}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
