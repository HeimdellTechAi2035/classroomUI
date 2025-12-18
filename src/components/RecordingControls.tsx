import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  Flag,
  Settings,
  Monitor,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { RecordingIndicator } from './RecordingIndicator';

interface RecordingSettings {
  recordScreen: boolean;
  recordTrainerAudio: boolean;
  recordSystemAudio: boolean;
  recordChat: boolean;
  recordAttendance: boolean;
  recordTimeline: boolean;
}

interface RecordingControlsProps {
  sessionId: string;
  cohortId: string;
  weekNumber: number;
  dayNumber: number;
  sessionNumber: number;
  isTrainer: boolean;
  onRecordingStateChange?: (isRecording: boolean, isPaused: boolean) => void;
  onMarkerAdded?: (marker: any) => void;
  trainerName?: string;
}

export default function RecordingControls({
  sessionId,
  cohortId,
  weekNumber,
  dayNumber,
  sessionNumber,
  isTrainer,
  onRecordingStateChange,
  onMarkerAdded,
  trainerName = 'Trainer',
}: RecordingControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [markerLabel, setMarkerLabel] = useState('');
  const [showMarkerInput, setShowMarkerInput] = useState(false);
  
  const [settings, setSettings] = useState<RecordingSettings>({
    recordScreen: true,
    recordTrainerAudio: true,
    recordSystemAudio: false,
    recordChat: true,
    recordAttendance: true,
    recordTimeline: true,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check recording status on mount
    checkRecordingStatus();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    onRecordingStateChange?.(isRecording, isPaused);
  }, [isRecording, isPaused]);

  const checkRecordingStatus = async () => {
    if (!window.electronAPI?.recording) return;
    
    const status = await window.electronAPI.recording.getStatus();
    setIsRecording(status.isRecording);
    setIsPaused(status.isPaused);
    if (status.duration) {
      setDuration(Math.floor(status.duration / 1000));
    }

    if (status.isRecording && !status.isPaused) {
      startTimer();
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const startRecording = async () => {
    if (!window.electronAPI?.recording) {
      console.error('Recording API not available');
      return;
    }

    try {
      // Start recording session in backend
      const result = await window.electronAPI.recording.start({
        sessionId,
        cohortId,
        weekNumber,
        dayNumber,
        sessionNumber,
        settings,
      });

      if (!result.success) {
        console.error('Failed to start recording:', result.error);
        return;
      }

      // Get screen sources if screen recording is enabled
      if (settings.recordScreen) {
        const sources = await window.electronAPI.recording.getSources();
        
        // For now, use the first screen source
        const screenSource = sources.find(s => s.name === 'Entire Screen' || s.name.includes('Screen')) || sources[0];
        
        if (screenSource) {
          // Use navigator.mediaDevices.getUserMedia with chromeMediaSourceId
          const constraints: any = {
            audio: settings.recordTrainerAudio ? {
              mandatory: {
                chromeMediaSource: 'desktop',
              },
            } : false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: screenSource.id,
                minWidth: 1280,
                maxWidth: 1920,
                minHeight: 720,
                maxHeight: 1080,
              },
            },
          };

          try {
            const stream = await (navigator.mediaDevices as any).getUserMedia(constraints);
            streamRef.current = stream;

            // Create MediaRecorder
            const mediaRecorder = new MediaRecorder(stream, {
              mimeType: 'video/webm;codecs=vp9,opus',
            });

            mediaRecorder.ondataavailable = async (event) => {
              if (event.data && event.data.size > 0) {
                const arrayBuffer = await event.data.arrayBuffer();
                await window.electronAPI?.recording.saveChunk(arrayBuffer);
              }
            };

            mediaRecorder.start(1000); // Save chunks every second
            mediaRecorderRef.current = mediaRecorder;
          } catch (err) {
            console.error('Failed to capture screen:', err);
            // Continue without screen recording
          }
        }
      }

      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      startTimer();
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const pauseRecording = async () => {
    if (!window.electronAPI?.recording) return;

    await window.electronAPI.recording.pause();
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }

    setIsPaused(true);
    stopTimer();
  };

  const resumeRecording = async () => {
    if (!window.electronAPI?.recording) return;

    await window.electronAPI.recording.resume();
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }

    setIsPaused(false);
    startTimer();
  };

  const stopRecording = async () => {
    if (!window.electronAPI?.recording) return;

    // Stop MediaRecorder
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Stop stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    await window.electronAPI.recording.stop();
    
    setIsRecording(false);
    setIsPaused(false);
    stopTimer();
    setShowStopConfirm(false);
  };

  const addMarker = async () => {
    if (!window.electronAPI?.recording || !markerLabel.trim()) return;

    const marker = await window.electronAPI.recording.addMarker(markerLabel.trim(), trainerName);
    if (marker) {
      onMarkerAdded?.(marker);
    }
    
    setMarkerLabel('');
    setShowMarkerInput(false);
  };

  const quickMarker = async () => {
    if (!window.electronAPI?.recording) return;

    const marker = await window.electronAPI.recording.addMarker('Important moment', trainerName);
    if (marker) {
      onMarkerAdded?.(marker);
    }
  };

  if (!isTrainer) {
    // Trainee view - just show indicator
    return <RecordingIndicator isRecording={isRecording} isPaused={isPaused} />;
  }

  return (
    <div className="bg-white rounded-xl border border-calm-200 shadow-lg overflow-hidden">
      {/* Main controls bar */}
      <div className="flex items-center gap-3 p-3">
        {/* Recording indicator */}
        <RecordingIndicator isRecording={isRecording} isPaused={isPaused} />

        {/* Duration */}
        {isRecording && (
          <div className="flex items-center gap-1.5 text-calm-600 font-mono text-sm bg-calm-100 px-3 py-1.5 rounded-lg">
            <Clock size={14} />
            {formatDuration(duration)}
          </div>
        )}

        {/* Control buttons */}
        <div className="flex items-center gap-2 ml-auto">
          {!isRecording ? (
            <>
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-4 py-2 bg-danger-500 hover:bg-danger-600 text-white rounded-lg font-medium transition-colors shadow-md"
              >
                <div className="w-3 h-3 bg-white rounded-full" />
                Start Recording
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-calm-500 hover:text-calm-700 hover:bg-calm-100 rounded-lg transition-colors"
                title="Recording settings"
              >
                <Settings size={18} />
              </button>
            </>
          ) : (
            <>
              {isPaused ? (
                <button
                  onClick={resumeRecording}
                  className="flex items-center gap-2 px-3 py-2 bg-success-500 hover:bg-success-600 text-white rounded-lg font-medium transition-colors"
                >
                  <Play size={16} />
                  Resume
                </button>
              ) : (
                <button
                  onClick={pauseRecording}
                  className="flex items-center gap-2 px-3 py-2 bg-warning-500 hover:bg-warning-600 text-white rounded-lg font-medium transition-colors"
                >
                  <Pause size={16} />
                  Pause
                </button>
              )}
              
              <button
                onClick={() => setShowStopConfirm(true)}
                className="flex items-center gap-2 px-3 py-2 bg-calm-200 hover:bg-calm-300 text-calm-700 rounded-lg font-medium transition-colors"
              >
                <Square size={16} />
                Stop
              </button>

              <div className="w-px h-6 bg-calm-200 mx-1" />

              {/* Marker buttons */}
              <button
                onClick={quickMarker}
                className="flex items-center gap-2 px-3 py-2 bg-accent-100 hover:bg-accent-200 text-accent-700 rounded-lg font-medium transition-colors"
                title="Mark important moment"
              >
                <Flag size={16} />
              </button>

              <button
                onClick={() => setShowMarkerInput(!showMarkerInput)}
                className="p-2 text-calm-500 hover:text-calm-700 hover:bg-calm-100 rounded-lg transition-colors"
                title="Add custom marker"
              >
                {showMarkerInput ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && !isRecording && (
        <div className="border-t border-calm-200 p-4 bg-calm-50">
          <h4 className="font-medium text-calm-800 mb-3">Recording Settings</h4>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-calm-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.recordScreen}
                onChange={(e) => setSettings({ ...settings, recordScreen: e.target.checked })}
                className="rounded border-calm-300 text-primary-500"
              />
              <Monitor size={16} />
              Screen / Slides
            </label>
            <label className="flex items-center gap-2 text-sm text-calm-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.recordTrainerAudio}
                onChange={(e) => setSettings({ ...settings, recordTrainerAudio: e.target.checked })}
                className="rounded border-calm-300 text-primary-500"
              />
              {settings.recordTrainerAudio ? <Mic size={16} /> : <MicOff size={16} />}
              Trainer Mic
            </label>
            <label className="flex items-center gap-2 text-sm text-calm-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.recordSystemAudio}
                onChange={(e) => setSettings({ ...settings, recordSystemAudio: e.target.checked })}
                className="rounded border-calm-300 text-primary-500"
              />
              {settings.recordSystemAudio ? <Volume2 size={16} /> : <VolumeX size={16} />}
              System Audio
            </label>
            <label className="flex items-center gap-2 text-sm text-calm-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.recordChat}
                onChange={(e) => setSettings({ ...settings, recordChat: e.target.checked })}
                className="rounded border-calm-300 text-primary-500"
              />
              Chat Transcript
            </label>
          </div>
        </div>
      )}

      {/* Custom marker input */}
      {showMarkerInput && isRecording && (
        <div className="border-t border-calm-200 p-3 bg-calm-50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={markerLabel}
              onChange={(e) => setMarkerLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMarker()}
              placeholder="Describe this moment..."
              className="flex-1 px-3 py-2 border border-calm-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
            <button
              onClick={addMarker}
              disabled={!markerLabel.trim()}
              className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Marker
            </button>
          </div>
        </div>
      )}

      {/* Stop confirmation modal */}
      {showStopConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-warning-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-warning-600" />
              </div>
              <h3 className="font-semibold text-calm-900">Stop Recording?</h3>
            </div>
            <p className="text-calm-600 text-sm mb-6">
              This will finalize and save the recording. You cannot resume once stopped.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="flex-1 px-4 py-2 border border-calm-300 text-calm-600 rounded-lg font-medium hover:bg-calm-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={stopRecording}
                className="flex-1 px-4 py-2 bg-danger-500 text-white rounded-lg font-medium hover:bg-danger-600 transition-colors"
              >
                Stop Recording
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
