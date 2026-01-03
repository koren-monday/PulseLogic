import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export type LoadingType = 'fetching' | 'analyzing' | 'generating' | 'saving' | 'syncing' | 'thinking';

interface LoadingOverlayProps {
  isLoading: boolean;
  type?: LoadingType;
  message?: string;
  /** If true, overlay covers the full viewport. Otherwise covers parent container */
  fullScreen?: boolean;
}

const LOADING_MESSAGES: Record<LoadingType, string[]> = {
  fetching: [
    'Fetching your health data...',
    'Connecting to Garmin...',
    'Retrieving your metrics...',
  ],
  analyzing: [
    'Analyzing your health patterns...',
    'Processing biometric data...',
    'Generating personalized insights...',
    'Examining trends and correlations...',
  ],
  generating: [
    'Generating your report...',
    'Crafting personalized recommendations...',
    'Building your health summary...',
  ],
  saving: [
    'Saving your data...',
    'Storing securely...',
  ],
  syncing: [
    'Syncing with cloud...',
    'Updating your records...',
  ],
  thinking: [
    'Thinking...',
    'Processing your question...',
    'Formulating response...',
  ],
};

export function LoadingOverlay({
  isLoading,
  type = 'analyzing',
  message,
  fullScreen = false,
}: LoadingOverlayProps) {
  const [currentMessage, setCurrentMessage] = useState(message || LOADING_MESSAGES[type][0]);
  const [dots, setDots] = useState('');

  // Cycle through messages for variety
  useEffect(() => {
    if (!isLoading || message) return;

    const messages = LOADING_MESSAGES[type];
    let messageIndex = 0;

    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setCurrentMessage(messages[messageIndex]);
    }, 3000);

    return () => clearInterval(interval);
  }, [isLoading, type, message]);

  // Animate dots
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  const baseMessage = message || currentMessage;
  const displayMessage = baseMessage.endsWith('...')
    ? baseMessage.slice(0, -3) + dots.padEnd(3, ' ')
    : baseMessage;

  return (
    <div
      className={`
        ${fullScreen ? 'fixed inset-0 z-50' : 'absolute inset-0 z-10 rounded-lg'}
        bg-slate-900/80 backdrop-blur-sm
        flex items-center justify-center
        transition-opacity duration-300
      `}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4 p-6">
        {/* Animated loader */}
        <div className="relative">
          {/* Outer pulse ring */}
          <div className="absolute inset-0 w-16 h-16 rounded-full bg-garmin-blue/20 animate-ping" />

          {/* Inner spinning ring */}
          <div className="relative w-16 h-16 rounded-full border-4 border-slate-700 border-t-garmin-blue animate-spin" />

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-garmin-blue animate-spin" style={{ animationDirection: 'reverse' }} />
          </div>
        </div>

        {/* Message */}
        <div className="text-center max-w-xs">
          <p className="text-white font-medium text-lg mb-1">
            {displayMessage}
          </p>
          <p className="text-slate-400 text-sm">
            Please wait while we process your request
          </p>
        </div>

        {/* Progress indicator dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-garmin-blue animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to use with a card/container that needs loading overlay
 * Returns props to spread on the container and the overlay component
 */
export function useLoadingContainer(isLoading: boolean) {
  return {
    containerProps: {
      className: isLoading ? 'relative pointer-events-none' : 'relative',
      'aria-busy': isLoading,
    },
    isLoading,
  };
}
