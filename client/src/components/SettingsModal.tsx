import { useState, useEffect } from 'react';
import { Settings, X, Eye, EyeOff, CheckCircle, Cpu, Save } from 'lucide-react';
import { useModelRegistry } from '../hooks';
import { Alert } from './Alert';
import { LoadingSpinner } from './LoadingSpinner';
import type { UserSettings } from '../utils/storage';
import type { LLMProvider } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [showApiKeys, setShowApiKeys] = useState<Record<LLMProvider, boolean>>({
    openai: false,
    anthropic: false,
    google: false,
  });
  const [saved, setSaved] = useState(false);

  const { data: modelRegistry, isLoading: modelsLoading } = useModelRegistry();

  // Reset local settings when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setSaved(false);
    }
  }, [isOpen, settings]);

  // Update selected model when provider changes
  useEffect(() => {
    if (modelRegistry && localSettings.selectedProvider) {
      const config = modelRegistry[localSettings.selectedProvider];
      const isValidModel = config.models.some(m => m.id === localSettings.selectedModel);
      if (!isValidModel) {
        setLocalSettings(prev => ({
          ...prev,
          selectedModel: config.defaultModel,
        }));
      }
    }
  }, [localSettings.selectedProvider, modelRegistry]);

  const handleProviderChange = (provider: LLMProvider) => {
    setLocalSettings(prev => ({
      ...prev,
      selectedProvider: provider,
      selectedModel: modelRegistry?.[provider]?.defaultModel || prev.selectedModel,
    }));
  };

  const handleModelChange = (model: string) => {
    setLocalSettings(prev => ({
      ...prev,
      selectedModel: model,
    }));
  };

  const handleApiKeyChange = (provider: LLMProvider, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      apiKeys: {
        ...prev.apiKeys,
        [provider]: value || undefined,
      },
    }));
  };

  const handleSave = () => {
    onSave(localSettings);
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const hasApiKey = !!localSettings.apiKeys[localSettings.selectedProvider];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-garmin-blue" />
            <h2 className="text-lg font-semibold">LLM Settings</h2>
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
          <p className="text-slate-400 text-sm">
            Configure your AI provider and API key. These settings are saved locally and will persist across sessions.
          </p>

          {modelsLoading ? (
            <LoadingSpinner message="Loading available models..." size="sm" />
          ) : modelRegistry ? (
            <div className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Provider</label>
                <div className="flex gap-2">
                  {(Object.keys(modelRegistry) as LLMProvider[]).map(provider => {
                    const config = modelRegistry[provider];
                    const hasKey = !!localSettings.apiKeys[provider];
                    return (
                      <button
                        key={provider}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                          ${localSettings.selectedProvider === provider
                            ? 'bg-garmin-blue text-white'
                            : 'bg-slate-700 text-white hover:bg-slate-600'}
                        `}
                        onClick={() => handleProviderChange(provider)}
                      >
                        {config.name}
                        {hasKey && <CheckCircle className="w-4 h-4 text-green-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Model</label>
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-slate-400" />
                  <select
                    className="input-field flex-1"
                    value={localSettings.selectedModel}
                    onChange={e => handleModelChange(e.target.value)}
                  >
                    {modelRegistry[localSettings.selectedProvider].models.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* API Keys */}
              <div>
                <label className="block text-sm font-medium mb-2">API Keys</label>
                <div className="space-y-3">
                  {(Object.keys(modelRegistry) as LLMProvider[]).map(provider => {
                    const config = modelRegistry[provider];
                    return (
                      <div key={provider} className="flex items-center gap-2">
                        <span className="w-24 text-sm text-slate-400">{config.name}</span>
                        <div className="relative flex-1">
                          <input
                            type={showApiKeys[provider] ? 'text' : 'password'}
                            className="input-field pr-10 text-sm w-full"
                            placeholder={`Enter ${config.name} API key...`}
                            value={localSettings.apiKeys[provider] || ''}
                            onChange={e => handleApiKeyChange(provider, e.target.value)}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            onClick={() => setShowApiKeys(prev => ({ ...prev, [provider]: !prev[provider] }))}
                          >
                            {showApiKeys[provider] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {localSettings.apiKeys[provider] && (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <Alert type="error" message="Failed to load available models" />
          )}

          {!hasApiKey && (
            <Alert type="warning" message="Please add an API key for the selected provider to use AI analysis." />
          )}

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
