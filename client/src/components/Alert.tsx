import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

interface AlertProps {
  type: 'error' | 'success' | 'info' | 'warning';
  message: string;
}

const alertConfig = {
  error: {
    icon: XCircle,
    bg: 'bg-red-900/50',
    border: 'border-red-500',
    text: 'text-red-200',
  },
  success: {
    icon: CheckCircle,
    bg: 'bg-green-900/50',
    border: 'border-green-500',
    text: 'text-green-200',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-900/50',
    border: 'border-blue-500',
    text: 'text-blue-200',
  },
  warning: {
    icon: AlertCircle,
    bg: 'bg-yellow-900/50',
    border: 'border-yellow-500',
    text: 'text-yellow-200',
  },
};

export function Alert({ type, message }: AlertProps) {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <div className={`${config.bg} ${config.border} ${config.text} border rounded-lg p-4 flex items-start gap-3`}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p>{message}</p>
    </div>
  );
}
