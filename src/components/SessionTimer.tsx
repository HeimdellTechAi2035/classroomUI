import { useState, useEffect } from 'react';
import { Clock, Play, Pause, RotateCcw } from 'lucide-react';

interface SessionTimerProps {
  isLive: boolean;
  startTime: string;
}

export default function SessionTimer({ isLive, startTime }: SessionTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [breakTimer, setBreakTimer] = useState<number | null>(null);
  const [breakRemaining, setBreakRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Session elapsed time
  useEffect(() => {
    if (!isLive) return;

    const start = new Date(startTime).getTime();
    
    const interval = setInterval(() => {
      const now = Date.now();
      setElapsed(Math.floor((now - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isLive, startTime]);

  // Break timer
  useEffect(() => {
    if (breakTimer === null || breakRemaining <= 0 || isPaused) return;

    const interval = setInterval(() => {
      setBreakRemaining(prev => {
        if (prev <= 1) {
          // Play notification sound
          playBreakEndSound();
          setBreakTimer(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [breakTimer, breakRemaining, isPaused]);

  const playBreakEndSound = () => {
    // Simple beep using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 440;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Could not play sound');
    }
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startBreak = (minutes: number) => {
    setBreakTimer(minutes);
    setBreakRemaining(minutes * 60);
    setIsPaused(false);
  };

  const cancelBreak = () => {
    setBreakTimer(null);
    setBreakRemaining(0);
    setIsPaused(false);
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-calm-800 flex items-center gap-2 mb-4">
        <Clock size={20} />
        Session Timer
      </h3>

      {/* Main Session Timer */}
      <div className={`text-center p-4 rounded-xl mb-4 ${
        isLive ? 'bg-primary-50' : 'bg-calm-50'
      }`}>
        <div className={`text-4xl font-mono font-bold ${
          isLive ? 'text-primary-700' : 'text-calm-500'
        }`}>
          {formatTime(elapsed)}
        </div>
        <p className="text-sm text-calm-600 mt-1">
          {isLive ? 'Session Duration' : 'Session not started'}
        </p>
      </div>

      {/* Break Timer */}
      {breakTimer !== null ? (
        <div className="bg-warning-50 rounded-xl p-4 mb-4">
          <div className="text-center">
            <p className="text-sm font-medium text-warning-700 mb-2">☕ Break Time</p>
            <div className="text-3xl font-mono font-bold text-warning-600">
              {formatTime(breakRemaining)}
            </div>
          </div>
          <div className="flex justify-center gap-2 mt-3">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="btn-secondary text-sm"
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button
              onClick={cancelBreak}
              className="btn-secondary text-sm"
            >
              <RotateCcw size={16} className="mr-1" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-calm-600 mb-2">Start a break:</p>
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 15, 20].map(mins => (
              <button
                key={mins}
                onClick={() => startBreak(mins)}
                className="btn-secondary text-sm"
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Time recommendations */}
      {elapsed > 0 && elapsed % 2700 < 60 && ( // Show near 45 min intervals
        <div className="mt-4 p-3 bg-primary-50 rounded-lg text-sm text-primary-700">
          💡 Consider a short break - you've been running for {Math.floor(elapsed / 60)} minutes
        </div>
      )}
    </div>
  );
}
