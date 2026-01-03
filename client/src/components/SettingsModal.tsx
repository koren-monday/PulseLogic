import { useState, useEffect } from 'react';
import { Settings, X, Save, Zap, Heart } from 'lucide-react';
import { Alert } from './Alert';
import { LifeContextSelector } from './LifeContextSelector';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getLifeContexts, storeLifeContexts } from '../utils/storage';
import { pushLifeContextsToCloud } from '../services/sync.service';
import { canUseAdvancedModel, GEMINI_MODELS } from '../types/subscription';
import type { UserSettings } from '../utils/storage';
import type { LifeContext } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

export function SettingsModal({ isOpen, onClose, userId, settings, onSave }: SettingsModalProps) {
  const { tier } = useSubscription();
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [lifeContexts, setLifeContexts] = useState<LifeContext[]>([]);
  const [saved, setSaved] = useState(false);

  const advancedModelAvailable = canUseAdvancedModel(tier);

  // Load life contexts and reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setLifeContexts(getLifeContexts(userId));
      setSaved(false);
    }
  }, [isOpen, settings, userId]);

  const handleSave = async () => {
    // Save settings
    onSave(localSettings);

    // Save life contexts locally
    storeLifeContexts(userId, lifeContexts);

    // Sync life contexts to cloud in background
    pushLifeContextsToCloud(userId, lifeContexts);

    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-garmin-blue" />
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Life Context Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-5 h-5 text-pink-400" />
              <h3 className="font-semibold">Life Context</h3>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Add personal circumstances that may affect your health metrics. This helps the AI provide more relevant and personalized analysis.
            </p>
            <LifeContextSelector
              contexts={lifeContexts}
              onChange={setLifeContexts}
            />
          </div>

          {/* Model Preferences Section - Only for paid tier */}
          {advancedModelAvailable && (
            <div className="border-t border-slate-700 pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold">AI Model Preferences</h3>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                Choose your default AI model for health analysis.
              </p>

              <div className="p-3 bg-slate-700/50 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.preferAdvancedModel ?? false}
                    onChange={e => setLocalSettings(prev => ({
                      ...prev,
                      preferAdvancedModel: e.target.checked,
                    }))}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-garmin-blue focus:ring-garmin-blue focus:ring-offset-slate-800"
                  />
                  <div>
                    <span className="font-medium text-white">Prefer Advanced Model</span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Use {GEMINI_MODELS.PRO} for more detailed analysis (instead of {GEMINI_MODELS.FLASH})
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Tier Info */}
          <div className="border-t border-slate-700 pt-6">
            <div className="p-3 bg-slate-700/30 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Current Plan</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                  tier === 'paid' ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-300'
                }`}>
                  {tier === 'paid' ? 'Pro' : 'Free'}
                </span>
              </div>
              {tier === 'free' && (
                <p className="text-xs text-slate-500 mt-2">
                  Upgrade to Pro for advanced model access, more reports, chat features, and daily snapshots.
                </p>
              )}
            </div>
          </div>

          {saved && (
            <Alert type="success" message="Settings saved successfully!" />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-slate-700">
          <button
            className="btn-secondary px-4"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn-primary px-4 flex items-center gap-2"
            onClick={handleSave}
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
