import { useState } from 'react';
import { Shield, Video, Mic, MessageSquare, Clock, Lock, CheckCircle } from 'lucide-react';

interface RecordingConsentProps {
  onAccept: () => void;
  onDecline?: () => void;
  retentionDays?: number;
  recordingFeatures?: {
    screenShare: boolean;
    trainerAudio: boolean;
    chat: boolean;
    timeline: boolean;
  };
  showDeclineOption?: boolean;
}

export default function RecordingConsent({
  onAccept,
  onDecline,
  retentionDays = 90,
  recordingFeatures = {
    screenShare: true,
    trainerAudio: true,
    chat: true,
    timeline: true,
  },
  showDeclineOption = false,
}: RecordingConsentProps) {
  const [understood, setUnderstood] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-accent-500 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Session Recording Notice</h2>
              <p className="text-white/80 text-sm">Please read before continuing</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Main notice */}
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
            <p className="text-calm-800 leading-relaxed">
              This session is being recorded locally for <strong>training quality</strong> and{' '}
              <strong>safeguarding audit</strong> purposes.
            </p>
          </div>

          {/* What is recorded */}
          <div>
            <h3 className="font-semibold text-calm-800 mb-3 flex items-center gap-2">
              <Video size={18} className="text-primary-500" />
              What is recorded:
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {recordingFeatures.screenShare && (
                <div className="flex items-center gap-2 text-sm text-calm-600 bg-calm-50 px-3 py-2 rounded-lg">
                  <CheckCircle size={16} className="text-success-500" />
                  Screen share / slides
                </div>
              )}
              {recordingFeatures.trainerAudio && (
                <div className="flex items-center gap-2 text-sm text-calm-600 bg-calm-50 px-3 py-2 rounded-lg">
                  <CheckCircle size={16} className="text-success-500" />
                  Trainer audio
                </div>
              )}
              {recordingFeatures.chat && (
                <div className="flex items-center gap-2 text-sm text-calm-600 bg-calm-50 px-3 py-2 rounded-lg">
                  <CheckCircle size={16} className="text-success-500" />
                  Chat transcript
                </div>
              )}
              {recordingFeatures.timeline && (
                <div className="flex items-center gap-2 text-sm text-calm-600 bg-calm-50 px-3 py-2 rounded-lg">
                  <CheckCircle size={16} className="text-success-500" />
                  Session timeline
                </div>
              )}
            </div>
          </div>

          {/* Storage info */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Lock size={18} className="text-calm-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-calm-800">Where it is stored</p>
                <p className="text-sm text-calm-500">On the training drive, not uploaded to the cloud</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock size={18} className="text-calm-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-calm-800">Retention period</p>
                <p className="text-sm text-calm-500">{retentionDays} days (then automatically deleted)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield size={18} className="text-calm-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-calm-800">Who can access</p>
                <p className="text-sm text-calm-500">Admin and authorised trainers only</p>
              </div>
            </div>
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="w-5 h-5 rounded border-calm-300 text-primary-500 focus:ring-primary-500 mt-0.5"
            />
            <span className="text-sm text-calm-700 group-hover:text-calm-900">
              I understand that this session will be recorded for quality and safeguarding purposes
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          {showDeclineOption && onDecline && (
            <button
              onClick={onDecline}
              className="flex-1 px-4 py-3 border border-calm-300 text-calm-600 rounded-xl font-medium hover:bg-calm-50 transition-colors"
            >
              I do not consent
            </button>
          )}
          <button
            onClick={onAccept}
            disabled={!understood}
            className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
              understood
                ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/25'
                : 'bg-calm-200 text-calm-400 cursor-not-allowed'
            }`}
          >
            I understand
          </button>
        </div>
      </div>
    </div>
  );
}
