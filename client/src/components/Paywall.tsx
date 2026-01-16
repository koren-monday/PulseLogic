import { X, Crown, Check, Sparkles } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';

interface PaywallProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribed?: () => void;
}

const PRO_FEATURES = [
  '10 LLM analyses per day',
  'Daily health snapshots',
  'Full report history',
  'Advanced AI model access',
  'Up to 360 days of data',
  'Priority support',
];

export function Paywall({ isOpen, onClose }: PaywallProps) {
  const { tier } = useSubscription();

  if (!isOpen) return null;

  // Already subscribed
  if (tier === 'paid') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crown className="w-6 h-6 text-yellow-400" />
              <h2 className="text-xl font-bold">You're a Pro!</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-slate-300 mb-6">
            Thank you for your subscription! You have access to all Pro features.
          </p>

          <button onClick={onClose} className="btn-primary w-full">
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold">Upgrade to Pro</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Features */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Pro Features
            </h3>
            <ul className="space-y-2">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-slate-300">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Web subscription info */}
          <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
            <p className="text-slate-300 text-sm">
              Web subscriptions coming soon! For now, Pro features are managed through your account settings.
            </p>
          </div>

          <button onClick={onClose} className="btn-secondary w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
