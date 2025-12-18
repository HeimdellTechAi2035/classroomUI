import { useState, useEffect } from 'react';

interface RecordingIndicatorProps {
  isRecording: boolean;
  isPaused?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  position?: 'inline' | 'fixed';
}

export function RecordingIndicator({
  isRecording,
  isPaused = false,
  showLabel = true,
  size = 'md',
  position = 'inline',
}: RecordingIndicatorProps) {
  const [visible, setVisible] = useState(true);

  // Blink effect for paused state
  useEffect(() => {
    if (isPaused) {
      const interval = setInterval(() => {
        setVisible((v) => !v);
      }, 500);
      return () => clearInterval(interval);
    } else {
      setVisible(true);
    }
  }, [isPaused]);

  if (!isRecording) return null;

  const sizeClasses = {
    sm: { dot: 'w-2 h-2', text: 'text-xs', padding: 'px-2 py-1' },
    md: { dot: 'w-2.5 h-2.5', text: 'text-sm', padding: 'px-3 py-1.5' },
    lg: { dot: 'w-3 h-3', text: 'text-base', padding: 'px-4 py-2' },
  };

  const positionClasses = position === 'fixed' 
    ? 'fixed top-4 right-4 z-50' 
    : '';

  const currentSize = sizeClasses[size];

  return (
    <div
      className={`
        inline-flex items-center gap-2 
        ${currentSize.padding} 
        ${positionClasses}
        ${isPaused ? 'bg-warning-500' : 'bg-danger-500'} 
        text-white rounded-lg font-medium shadow-lg
        ${visible ? 'opacity-100' : 'opacity-50'}
        transition-opacity duration-200
      `}
    >
      <span
        className={`
          ${currentSize.dot} 
          ${isPaused ? 'bg-white' : 'bg-white animate-pulse'} 
          rounded-full
        `}
      />
      {showLabel && (
        <span className={currentSize.text}>
          {isPaused ? 'PAUSED' : 'REC'}
        </span>
      )}
    </div>
  );
}

// Larger banner version for prominent display
export function RecordingBanner({
  isRecording,
  isPaused = false,
}: {
  isRecording: boolean;
  isPaused?: boolean;
}) {
  if (!isRecording) return null;

  return (
    <div
      className={`
        w-full py-2 px-4 flex items-center justify-center gap-3
        ${isPaused ? 'bg-warning-500' : 'bg-danger-500'}
        text-white text-sm font-medium
      `}
    >
      <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
      <span>
        {isPaused
          ? 'Recording paused — Session is still being tracked'
          : 'This session is being recorded for quality and safeguarding'}
      </span>
    </div>
  );
}
