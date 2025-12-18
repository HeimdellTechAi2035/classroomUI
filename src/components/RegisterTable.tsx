import { useState, useEffect, useCallback } from 'react';
import { Check, CheckCircle, Circle, Save, UserCheck } from 'lucide-react';

interface Trainee {
  id: string;
  name: string;
  accessNeeds?: string;
}

interface AttendanceRecord {
  traineeId: string;
  traineeName: string;
  status: 'present' | 'late' | 'absent' | 'left_early' | 'excused';
  moodScore?: number;
  note?: string;
}

interface RegisterTableProps {
  sessionId: string;
  cohortId: string;
  isLive: boolean;
}

const statusOptions = [
  { value: 'present', label: 'Present', color: 'bg-success-500' },
  { value: 'late', label: 'Late', color: 'bg-warning-500' },
  { value: 'absent', label: 'Absent', color: 'bg-danger-500' },
  { value: 'left_early', label: 'Left Early', color: 'bg-orange-500' },
  { value: 'excused', label: 'Excused', color: 'bg-calm-500' },
];

const moodEmojis = ['😟', '😕', '😐', '🙂', '😊'];

export default function RegisterTable({ sessionId, cohortId, isLive }: RegisterTableProps) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load trainees and attendance
  useEffect(() => {
    loadData();
  }, [sessionId, cohortId]);

  const loadData = async () => {
    if (!window.electronAPI) {
      // Demo data for development
      const demoTrainees = [
        { id: '1', name: 'Alex Thompson', accessNeeds: 'Large text' },
        { id: '2', name: 'Jordan Smith' },
        { id: '3', name: 'Sam Wilson', accessNeeds: 'Screen reader' },
        { id: '4', name: 'Casey Brown' },
        { id: '5', name: 'Morgan Davis' },
      ];
      setTrainees(demoTrainees);
      setAttendance(demoTrainees.map(t => ({
        traineeId: t.id,
        traineeName: t.name,
        status: 'absent',
        moodScore: undefined,
        note: '',
      })));
      return;
    }

    try {
      const members = await window.electronAPI.db.getCohortMembers(cohortId) as Trainee[];
      setTrainees(members);

      const existingAttendance = await window.electronAPI.db.getAttendance(sessionId) as AttendanceRecord[];
      
      // Merge existing attendance with trainee list
      const merged = members.map(trainee => {
        const existing = existingAttendance.find(a => a.traineeId === trainee.id);
        return existing || {
          traineeId: trainee.id,
          traineeName: trainee.name,
          status: 'absent' as const,
          moodScore: undefined,
          note: '',
        };
      });
      
      setAttendance(merged);
    } catch (error) {
      console.error('Failed to load attendance:', error);
    }
  };

  // Update attendance record
  const updateRecord = (traineeId: string, updates: Partial<AttendanceRecord>) => {
    setAttendance(prev => prev.map(record => 
      record.traineeId === traineeId 
        ? { ...record, ...updates }
        : record
    ));
    setHasChanges(true);
  };

  // Mark all present
  const markAllPresent = () => {
    setAttendance(prev => prev.map(record => ({
      ...record,
      status: 'present',
    })));
    setHasChanges(true);
  };

  // Save attendance
  const saveAttendance = useCallback(async () => {
    if (!window.electronAPI) return;
    
    setSaving(true);
    try {
      await window.electronAPI.db.saveAttendance(sessionId, attendance);
      setHasChanges(false);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save attendance:', error);
    }
    setSaving(false);
  }, [sessionId, attendance]);

  // Auto-save every 30 seconds if there are changes
  useEffect(() => {
    if (!hasChanges) return;
    
    const timer = setTimeout(() => {
      saveAttendance();
    }, 30000);

    return () => clearTimeout(timer);
  }, [hasChanges, saveAttendance]);

  // Calculate summary
  const summary = {
    present: attendance.filter(a => a.status === 'present').length,
    late: attendance.filter(a => a.status === 'late').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    total: attendance.length,
  };

  return (
    <div>
      {/* Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={markAllPresent}
            className="btn-secondary text-sm"
            disabled={!isLive}
          >
            <UserCheck size={16} className="mr-1" />
            Mark All Present
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Summary */}
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success-500" />
              {summary.present} present
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-warning-500" />
              {summary.late} late
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-danger-500" />
              {summary.absent} absent
            </span>
          </div>

          {/* Save button */}
          <button
            onClick={saveAttendance}
            disabled={!hasChanges || saving}
            className={`btn text-sm ${hasChanges ? 'btn-primary' : 'btn-secondary'}`}
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save size={16} className="mr-1" />
                {hasChanges ? 'Save Changes' : 'Saved'}
              </>
            )}
          </button>
        </div>
      </div>

      {lastSaved && (
        <p className="text-xs text-calm-500 mb-2">
          Last saved: {lastSaved.toLocaleTimeString()}
        </p>
      )}

      {/* Attendance Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-calm-200">
              <th className="text-left py-3 px-4 font-medium text-calm-600">Name</th>
              <th className="text-left py-3 px-4 font-medium text-calm-600">Status</th>
              <th className="text-center py-3 px-4 font-medium text-calm-600">Mood</th>
              <th className="text-left py-3 px-4 font-medium text-calm-600">Notes</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((record) => {
              const trainee = trainees.find(t => t.id === record.traineeId);
              
              return (
                <tr key={record.traineeId} className="border-b border-calm-100 hover:bg-calm-50">
                  <td className="py-3 px-4">
                    <div>
                      <span className="font-medium text-calm-800">{record.traineeName}</span>
                      {trainee?.accessNeeds && (
                        <span className="ml-2 text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                          {trainee.accessNeeds}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {statusOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => updateRecord(record.traineeId, { 
                            status: option.value as AttendanceRecord['status'] 
                          })}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            record.status === option.value
                              ? `${option.color} text-white`
                              : 'bg-calm-100 text-calm-600 hover:bg-calm-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center gap-1">
                      {moodEmojis.map((emoji, index) => (
                        <button
                          key={index}
                          onClick={() => updateRecord(record.traineeId, { 
                            moodScore: index + 1 
                          })}
                          className={`text-xl p-1 rounded transition-transform ${
                            record.moodScore === index + 1
                              ? 'scale-125 bg-primary-100'
                              : 'opacity-50 hover:opacity-100 hover:scale-110'
                          }`}
                          title={`Mood: ${index + 1}/5`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      value={record.note || ''}
                      onChange={(e) => updateRecord(record.traineeId, { note: e.target.value })}
                      placeholder="Add note..."
                      className="w-full px-3 py-1 text-sm border border-calm-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {attendance.length === 0 && (
        <div className="text-center py-8 text-calm-500">
          No trainees in this cohort yet. Add trainees from the People section.
        </div>
      )}
    </div>
  );
}
