import { useState, useEffect } from 'react';
import { Settings, X, Save, Zap, Heart, Trash2, AlertTriangle } from 'lucide-react';
import { Alert } from './Alert';
import { LifeContextSelector } from './LifeContextSelector';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getLifeContexts, storeLifeContexts } from '../utils/storage';
import { pushLifeContextsToCloud } from '../services/sync.service';
import { deleteAccount } from '../services/api';
import { canUseAdvancedModel } from '../types/subscription';
import type { UserSettings } from '../utils/storage';
import type { LifeContext } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
  onDeleteAccount: () => Promise<void>;
}

export function SettingsModal({ isOpen, onClose, userId, settings, onSave, onDeleteAccount }: SettingsModalProps) {
  const { tier } = useSubscription();
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [lifeContexts, setLifeContexts] = useState<LifeContext[]>([]);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const advancedModelAvailable = canUseAdvancedModel(tier);

  // Load life contexts and reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setLifeContexts(getLifeContexts(userId));
      setSaved(false);
      setShowDeleteConfirm(false);
      setDeleteError(null);
    }
  }, [isOpen, settings, userId]);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount(userId);
      await onDeleteAccount();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  };

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
                <h3 className="font-semibold">AI Agent Mode</h3>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                Choose how your AI health agent analyzes your data.
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
                    <span className="font-medium text-white">Enable Advanced Mode</span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Deep multi-step reasoning for comprehensive health insights
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
                  Upgrade to Pro for advanced AI agent mode, more reports, chat features, and daily snapshots.
                </p>
              )}
            </div>
          </div>

          {/* Delete Account Section */}
          <div className="border-t border-slate-700 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-5 h-5 text-red-400" />
              <h3 className="font-semibold text-red-400">Delete Account</h3>
            </div>

            {!showDeleteConfirm ? (
              <div>
                <p className="text-slate-400 text-sm mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-red-400 border border-red-400/50 rounded-lg hover:bg-red-400/10 transition-colors"
                >
                  Delete Account
                </button>
              </div>
            ) : (
              <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-300 font-medium">Are you sure?</p>
                    <p className="text-slate-400 text-sm mt-1">
                      This will permanently delete your account, all reports, actions, statistics, and settings. You will be logged out immediately.
                    </p>
                  </div>
                </div>
                {deleteError && (
                  <Alert type="error" message={deleteError} />
                )}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Yes, Delete My Account
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
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
