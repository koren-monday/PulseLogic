import { useState, useEffect, useRef } from 'react';
import { Brain, Sparkles, RefreshCw, ChevronLeft, Copy, Check, Settings, Send, MessageCircle, User, Bot, CheckCircle, Lock, Zap } from 'lucide-react';
import { useAnalysis, useChat, useSaveReport } from '../hooks';
import { Alert } from '../components/Alert';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LifeContextSelector } from '../components/LifeContextSelector';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getLifeContexts, storeLifeContexts } from '../utils/storage';
import { pushLifeContextsToCloud } from '../services/sync.service';
import { canUseAdvancedModel } from '../types/subscription';
import type { GarminHealthData, AnalysisResponse, ChatMessage, LifeContext } from '../types';

interface AnalysisStepProps {
  healthData: GarminHealthData;
  userId: string;
  preferAdvancedModel?: boolean;
  onBack: () => void;
  onReset: () => void;
  onOpenSettings: () => void;
}

export function AnalysisStep({
  healthData,
  userId,
  preferAdvancedModel = false,
  onBack,
  onReset,
  onOpenSettings,
}: AnalysisStepProps) {
  const {
    reportsRemaining,
    canChat,
    checkReportAllowed,
    checkChatAllowed,
    tier,
    refreshTier,
  } = useSubscription();

  const [useAdvancedModel, setUseAdvancedModel] = useState(preferAdvancedModel);
  const [customPrompt, setCustomPrompt] = useState('');
  const [lifeContexts, setLifeContexts] = useState<LifeContext[]>(() => {
    return getLifeContexts(userId);
  });
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [chatLimitError, setChatLimitError] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const analysisMutation = useAnalysis();
  const chatMutation = useChat();
  const saveReportMutation = useSaveReport();

  // Check if user can use advanced model
  const advancedModelAvailable = canUseAdvancedModel(tier);
  const activeModeName = useAdvancedModel && advancedModelAvailable ? 'Advanced' : 'Standard';

  // Persist life contexts when they change
  useEffect(() => {
    storeLifeContexts(userId, lifeContexts);
    // Sync to cloud in background
    pushLifeContextsToCloud(userId, lifeContexts);
  }, [userId, lifeContexts]);

  const handleAnalyze = async () => {
    setLimitError(null);

    // Check report limit first
    const limitCheck = await checkReportAllowed();
    if (!limitCheck.allowed) {
      setLimitError(limitCheck.reason || 'Report limit reached');
      return;
    }

    try {
      const result = await analysisMutation.mutateAsync({
        userId,
        healthData,
        useAdvancedModel: useAdvancedModel && advancedModelAvailable,
        customPrompt: customPrompt || undefined,
        lifeContexts: lifeContexts.length > 0 ? lifeContexts : undefined,
      });
      setAnalysis(result);
      setSavedReportId(null); // Reset saved status for new analysis
      refreshTier(); // Refresh tier info to update remaining counts

      // Auto-save if we have structured data
      if (result.structured) {
        const reportId = await saveReportMutation.mutateAsync({
          dateRange: healthData.dateRange,
          model: result.model,
          markdown: result.analysis,
          structured: result.structured,
          healthData,
          lifeContexts: lifeContexts.length > 0 ? lifeContexts : undefined,
        });
        setSavedReportId(reportId);
      }
    } catch {
      // Error handled by mutation
    }
  };

  const handleCopy = async () => {
    if (analysis) {
      await navigator.clipboard.writeText(analysis.analysis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Scroll chat to bottom when new messages appear
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Initialize chat with analysis as first assistant message
  useEffect(() => {
    if (analysis && chatMessages.length === 0) {
      setChatMessages([{ role: 'assistant', content: analysis.analysis }]);
    }
  }, [analysis, chatMessages.length]);

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatMutation.isPending || !savedReportId) return;
    setChatLimitError(null);

    // Check chat limit
    const chatCheck = await checkChatAllowed(savedReportId);
    if (!chatCheck.allowed) {
      setChatLimitError(chatCheck.reason || 'Chat limit reached for this report');
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: chatInput.trim() };
    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setChatInput('');

    try {
      const result = await chatMutation.mutateAsync({
        userId,
        reportId: savedReportId,
        healthData,
        useAdvancedModel: useAdvancedModel && advancedModelAvailable,
        messages: newMessages,
      });
      setChatMessages([...newMessages, { role: 'assistant', content: result.message }]);
      refreshTier(); // Refresh to update chat remaining count
    } catch {
      // Error is handled by mutation, remove the user message if failed
      setChatMessages(chatMessages);
    }
  };

  return (
    <div className="space-y-6">
      {/* Analysis Controls */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-garmin-blue" />
          <h2 className="text-lg font-semibold">AI Health Analysis</h2>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          Generate personalized insights from your health data using AI.
        </p>

        {/* Model Selection - Only for paid tier */}
        {advancedModelAvailable && (
          <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useAdvancedModel}
                onChange={e => setUseAdvancedModel(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-garmin-blue focus:ring-garmin-blue focus:ring-offset-slate-800"
              />
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="font-medium text-white">Enable Advanced Mode</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Deep multi-step reasoning for comprehensive health insights
                </p>
              </div>
            </label>
            <p className="text-xs text-slate-500 mt-2">
              Mode: <span className="text-slate-300">{activeModeName}</span>
            </p>
          </div>
        )}

        {/* Life Context */}
        <LifeContextSelector
          contexts={lifeContexts}
          onChange={setLifeContexts}
        />
        <button
          type="button"
          className="text-xs text-garmin-blue hover:underline mb-2 flex items-center gap-1"
          onClick={onOpenSettings}
        >
          <Settings className="w-3 h-3" />
          Manage life contexts in Settings
        </button>

        {/* Custom Prompt */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Custom Analysis Request (optional)
          </label>
          <textarea
            className="input-field min-h-[80px]"
            placeholder="e.g., Focus on my marathon training progress and recovery patterns..."
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
          />
        </div>

        {analysisMutation.isError && (
          <Alert
            type="error"
            message={analysisMutation.error?.message || 'Analysis failed'}
          />
        )}

        {limitError && (
          <Alert type="warning" message={limitError} />
        )}

        {/* Reports remaining indicator */}
        <p className="text-xs text-slate-400 mb-2">
          {reportsRemaining > 0 ? (
            <>Reports remaining: <span className="text-white font-medium">{reportsRemaining}</span></>
          ) : (
            <span className="text-yellow-400">
              {tier === 'free' ? 'Weekly limit reached. Upgrade to Pro for more reports.' : 'Daily limit reached. Try again tomorrow.'}
            </span>
          )}
        </p>

        <button
          className="btn-primary w-full flex items-center justify-center gap-2"
          onClick={handleAnalyze}
          disabled={analysisMutation.isPending || reportsRemaining === 0}
        >
          {analysisMutation.isPending ? (
            <LoadingSpinner size="sm" message="Analyzing with AI..." />
          ) : reportsRemaining === 0 ? (
            <>
              <Lock className="w-4 h-4" />
              Limit Reached
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {analysis ? 'Re-analyze' : 'Generate Analysis'}
            </>
          )}
        </button>
      </div>

      {/* Conversation Thread */}
      {chatMessages.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-garmin-blue" />
              <h3 className="font-semibold">Conversation</h3>
            </div>
            <div className="flex items-center gap-2">
              {savedReportId && (
                <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
                  <CheckCircle className="w-3 h-3" />
                  Saved
                </span>
              )}
              <span className="text-xs text-slate-500">
                {activeModeName} Mode
              </span>
              <button
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                onClick={handleCopy}
                title="Copy analysis to clipboard"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto mb-4 pr-2">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-garmin-blue flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`
                    max-w-[85%] rounded-lg p-4
                    ${msg.role === 'user'
                      ? 'bg-garmin-blue text-white'
                      : 'bg-slate-700 text-slate-300'}
                  `}
                >
                  {msg.role === 'assistant' ? (
                    <div
                      className="prose prose-invert prose-sm max-w-none leading-relaxed whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: msg.content
                          .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>')
                          .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-white mt-6 mb-3">$1</h2>')
                          .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mt-6 mb-4">$1</h1>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                          .replace(/^\- (.*$)/gm, '<li class="ml-4">$1</li>')
                          .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>'),
                      }}
                    />
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-garmin-blue flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-slate-700 rounded-lg p-4">
                  <LoadingSpinner size="sm" message="Thinking..." />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          {canChat ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field flex-1"
                  placeholder="Ask a follow-up question about your health data..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                  disabled={chatMutation.isPending}
                />
                <button
                  className="btn-primary px-4 flex items-center gap-2"
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || chatMutation.isPending}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {chatLimitError && (
                <Alert type="warning" message={chatLimitError} />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg text-sm text-slate-400">
              <Lock className="w-4 h-4" />
              <span>
                Follow-up questions are available on Pro. Upgrade to chat with your reports.
              </span>
            </div>
          )}

          {chatMutation.isError && (
            <Alert
              type="error"
              message={chatMutation.error?.message || 'Failed to send message'}
            />
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-4">
        <button
          className="btn-secondary flex-1 flex items-center justify-center gap-2"
          onClick={onBack}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Data
        </button>
        <button
          className="btn-secondary flex-1 flex items-center justify-center gap-2"
          onClick={onReset}
        >
          <RefreshCw className="w-4 h-4" />
          Start Over
        </button>
      </div>
    </div>
  );
}
