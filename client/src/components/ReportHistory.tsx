import { History, Calendar, Trash2, Eye, ChevronRight, AlertCircle } from 'lucide-react';
import { useReportHistory, useDeleteReport } from '../hooks';
import { LoadingSpinner } from './LoadingSpinner';
import type { SavedReport } from '../db/schema';

interface ReportHistoryProps {
  onViewReport: (report: SavedReport) => void;
  compact?: boolean;
}

export function ReportHistory({ onViewReport, compact = false }: ReportHistoryProps) {
  const { data: reports, isLoading, error } = useReportHistory(compact ? 5 : 20);
  const deleteMutation = useDeleteReport();

  const handleDelete = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    if (confirm('Delete this report? This action cannot be undone.')) {
      deleteMutation.mutate(reportId);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatDateRange = (start: string, end: string) => {
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  if (isLoading) {
    return (
      <div className="card">
        <LoadingSpinner size="sm" message="Loading history..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Failed to load report history</span>
        </div>
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-5 h-5 text-garmin-blue" />
          <h3 className="font-semibold">Report History</h3>
        </div>
        <p className="text-slate-400 text-sm">
          No saved reports yet. Generate an analysis to get started.
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? '' : 'card'}>
      {!compact && (
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-garmin-blue" />
          <h3 className="font-semibold">Report History</h3>
          <span className="text-xs text-slate-500 ml-auto">
            {reports.length} report{reports.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="space-y-2">
        {reports.map((report) => (
          <button
            key={report.id}
            onClick={() => onViewReport(report)}
            className="w-full text-left p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {formatDateRange(report.dateRange.start, report.dateRange.end)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {report.model}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Overall Score Badge */}
                {report.structured?.metrics.overallScore !== undefined && (
                  <div
                    className={`
                      px-2 py-0.5 rounded text-xs font-medium
                      ${report.structured.metrics.overallScore >= 80
                        ? 'bg-green-500/20 text-green-400'
                        : report.structured.metrics.overallScore >= 60
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'}
                    `}
                  >
                    {report.structured.metrics.overallScore}
                  </div>
                )}

                <button
                  onClick={(e) => handleDelete(e, report.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-600/50 rounded transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete report"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <Eye className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Preview: First few achievements or summary */}
            {report.structured?.achievements && report.structured.achievements.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {report.structured.achievements.slice(0, 3).map((achievement, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded"
                  >
                    {achievement}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      {compact && reports.length >= 5 && (
        <button className="w-full mt-3 text-sm text-garmin-blue hover:text-garmin-light-blue transition-colors">
          View all reports...
        </button>
      )}
    </div>
  );
}
