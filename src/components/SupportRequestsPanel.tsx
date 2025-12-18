import { useState, useEffect } from 'react';
import { X, HelpCircle, Check, Clock, AlertCircle } from 'lucide-react';

interface SupportFlag {
  id: string;
  traineeId: string;
  traineeName: string;
  sessionId?: string;
  reason: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  createdAt: string;
  trainerNotes?: string;
}

interface SupportRequestsPanelProps {
  sessionId: string;
  onClose: () => void;
}

export default function SupportRequestsPanel({ sessionId, onClose }: SupportRequestsPanelProps) {
  const [flags, setFlags] = useState<SupportFlag[]>([]);
  const [selectedFlag, setSelectedFlag] = useState<SupportFlag | null>(null);
  const [trainerNotes, setTrainerNotes] = useState('');

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    if (!window.electronAPI) {
      // Demo data
      setFlags([
        {
          id: '1',
          traineeId: '1',
          traineeName: 'Alex Thompson',
          sessionId,
          reason: 'Having trouble understanding the SEO concepts',
          status: 'pending',
          createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
        },
        {
          id: '2',
          traineeId: '2',
          traineeName: 'Jordan Smith',
          sessionId,
          reason: 'Technical issue - audio not working',
          status: 'acknowledged',
          createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
          trainerNotes: 'Suggested checking audio settings',
        },
      ]);
      return;
    }

    try {
      const data = await window.electronAPI.db.getSupportFlags() as SupportFlag[];
      setFlags(data.filter(f => f.sessionId === sessionId || f.status === 'pending'));
    } catch (error) {
      console.error('Failed to load support flags:', error);
    }
  };

  const handleAcknowledge = async (flag: SupportFlag) => {
    if (!window.electronAPI) {
      setFlags(prev => prev.map(f => 
        f.id === flag.id ? { ...f, status: 'acknowledged' } : f
      ));
      return;
    }

    try {
      await window.electronAPI.db.updateSupportFlag(flag.id, { status: 'acknowledged' });
      loadFlags();
    } catch (error) {
      console.error('Failed to acknowledge flag:', error);
    }
  };

  const handleResolve = async (flag: SupportFlag) => {
    if (!window.electronAPI) {
      setFlags(prev => prev.map(f => 
        f.id === flag.id ? { ...f, status: 'resolved', trainerNotes } : f
      ));
      setSelectedFlag(null);
      setTrainerNotes('');
      return;
    }

    try {
      await window.electronAPI.db.updateSupportFlag(flag.id, { 
        status: 'resolved',
        trainerNotes,
      });
      loadFlags();
      setSelectedFlag(null);
      setTrainerNotes('');
    } catch (error) {
      console.error('Failed to resolve flag:', error);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const minutes = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const pendingCount = flags.filter(f => f.status === 'pending').length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden m-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-calm-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle size={20} className="text-primary-500" />
            <h2 className="text-lg font-semibold text-calm-800">Support Requests</h2>
            {pendingCount > 0 && (
              <span className="badge badge-warning">{pendingCount} pending</span>
            )}
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
          {flags.length === 0 ? (
            <div className="p-8 text-center text-calm-500">
              <HelpCircle size={48} className="mx-auto mb-4 text-calm-300" />
              <p>No support requests</p>
              <p className="text-sm mt-1">Trainees can request help during live sessions</p>
            </div>
          ) : (
            <div className="divide-y divide-calm-100">
              {flags.map(flag => (
                <div 
                  key={flag.id}
                  className={`p-4 ${
                    flag.status === 'pending' ? 'bg-warning-50' :
                    flag.status === 'acknowledged' ? 'bg-primary-50' : 'bg-calm-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-calm-800">{flag.traineeName}</span>
                        <span className={`badge text-xs ${
                          flag.status === 'pending' ? 'badge-warning' :
                          flag.status === 'acknowledged' ? 'badge-info' : 'badge-success'
                        }`}>
                          {flag.status}
                        </span>
                      </div>
                      <p className="text-sm text-calm-600">{flag.reason}</p>
                      <p className="text-xs text-calm-400 mt-1 flex items-center gap-1">
                        <Clock size={12} />
                        {getTimeAgo(flag.createdAt)}
                      </p>
                      
                      {flag.trainerNotes && (
                        <div className="mt-2 p-2 bg-white rounded text-sm text-calm-600">
                          <strong>Notes:</strong> {flag.trainerNotes}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {flag.status === 'pending' && (
                        <button
                          onClick={() => handleAcknowledge(flag)}
                          className="btn-secondary text-xs"
                        >
                          Acknowledge
                        </button>
                      )}
                      {flag.status !== 'resolved' && (
                        <button
                          onClick={() => setSelectedFlag(flag)}
                          className="btn-success text-xs"
                        >
                          <Check size={14} className="mr-1" />
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resolve Dialog */}
        {selectedFlag && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 m-4 w-full max-w-md">
              <h3 className="font-semibold text-calm-800 mb-2">
                Resolve request from {selectedFlag.traineeName}
              </h3>
              <p className="text-sm text-calm-600 mb-4">{selectedFlag.reason}</p>
              
              <textarea
                value={trainerNotes}
                onChange={(e) => setTrainerNotes(e.target.value)}
                placeholder="Add notes about how this was resolved (optional)..."
                className="input mb-4 min-h-[100px]"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setSelectedFlag(null);
                    setTrainerNotes('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleResolve(selectedFlag)}
                  className="btn-success"
                >
                  <Check size={18} className="mr-1" />
                  Mark Resolved
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
