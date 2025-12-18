import { useState } from 'react';
import { Video, ExternalLink, Copy, Check, Key, Eye, EyeOff, FileText } from 'lucide-react';

interface ZoomControlsProps {
  zoomUrl?: string;
  meetingId?: string;
  passcode?: string;
  hostNotes?: string;
  onCopy: (text: string, label: string) => void;
  copied: string | null;
}

export default function ZoomControls({
  zoomUrl,
  meetingId,
  passcode,
  hostNotes,
  onCopy,
  copied,
}: ZoomControlsProps) {
  const [showPasscode, setShowPasscode] = useState(false);
  const [showHostNotes, setShowHostNotes] = useState(false);

  const openZoomLink = async () => {
    if (zoomUrl && window.electronAPI) {
      await window.electronAPI.openExternal(zoomUrl);
    } else if (zoomUrl) {
      window.open(zoomUrl, '_blank');
    }
  };

  if (!zoomUrl && !meetingId) {
    return (
      <div className="card bg-calm-50 border-calm-200">
        <div className="flex items-center gap-3 text-calm-600">
          <Video size={24} className="text-calm-400" />
          <div>
            <p className="font-medium">No Zoom link configured</p>
            <p className="text-sm">Set a default Zoom link in cohort settings or add one for this session.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-calm-800 flex items-center gap-2 mb-4">
        <Video size={20} className="text-primary-500" />
        Zoom Meeting
      </h3>

      <div className="space-y-4">
        {/* Main Actions */}
        <div className="flex flex-wrap gap-3">
          {zoomUrl && (
            <button
              onClick={openZoomLink}
              className="btn-primary btn-lg flex-1"
            >
              <ExternalLink size={20} className="mr-2" />
              Open Zoom Link
            </button>
          )}
          
          {zoomUrl && (
            <button
              onClick={() => onCopy(zoomUrl, 'zoom')}
              className="btn-secondary btn-lg"
            >
              {copied === 'zoom' ? (
                <Check size={20} className="text-success-500" />
              ) : (
                <Copy size={20} />
              )}
            </button>
          )}
        </div>

        {/* Meeting Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meetingId && (
            <div className="p-3 bg-calm-50 rounded-lg">
              <label className="text-xs text-calm-500 uppercase tracking-wide">Meeting ID</label>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-calm-800">{meetingId}</span>
                <button
                  onClick={() => onCopy(meetingId, 'meetingId')}
                  className="btn-icon"
                  title="Copy Meeting ID"
                >
                  {copied === 'meetingId' ? (
                    <Check size={16} className="text-success-500" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            </div>
          )}

          {passcode && (
            <div className="p-3 bg-calm-50 rounded-lg">
              <label className="text-xs text-calm-500 uppercase tracking-wide">Passcode</label>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-calm-800">
                  {showPasscode ? passcode : '••••••'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="btn-icon"
                    title={showPasscode ? 'Hide passcode' : 'Show passcode'}
                  >
                    {showPasscode ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => onCopy(passcode, 'passcode')}
                    className="btn-icon"
                    title="Copy Passcode"
                  >
                    {copied === 'passcode' ? (
                      <Check size={16} className="text-success-500" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Copy all details button */}
        <button
          onClick={() => {
            const details = [
              zoomUrl && `Zoom Link: ${zoomUrl}`,
              meetingId && `Meeting ID: ${meetingId}`,
              passcode && `Passcode: ${passcode}`,
            ].filter(Boolean).join('\n');
            onCopy(details, 'all');
          }}
          className="w-full btn-secondary text-sm"
        >
          {copied === 'all' ? (
            <>
              <Check size={16} className="mr-1 text-success-500" />
              Copied all details!
            </>
          ) : (
            <>
              <Copy size={16} className="mr-1" />
              Copy All Meeting Details
            </>
          )}
        </button>

        {/* Host Notes (collapsible) */}
        {hostNotes && (
          <div className="border-t border-calm-200 pt-4">
            <button
              onClick={() => setShowHostNotes(!showHostNotes)}
              className="flex items-center gap-2 text-sm text-calm-600 hover:text-calm-800"
            >
              <FileText size={16} />
              Host Notes
              <span className="text-xs text-calm-400">(trainer-only)</span>
            </button>
            
            {showHostNotes && (
              <div className="mt-2 p-3 bg-warning-50 rounded-lg text-sm text-warning-800 whitespace-pre-wrap">
                {hostNotes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
