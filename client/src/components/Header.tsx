import { Activity } from 'lucide-react';

export function Header() {
  return (
    <header className="flex items-center justify-center gap-3 py-8">
      <Activity className="w-10 h-10 text-garmin-blue" />
      <div>
        <h1 className="text-2xl font-bold text-white">Garmin Insights Engine</h1>
        <p className="text-slate-400 text-sm">AI-Powered Health Data Analysis</p>
      </div>
    </header>
  );
}
