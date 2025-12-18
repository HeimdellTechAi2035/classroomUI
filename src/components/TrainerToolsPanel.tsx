import { useState } from 'react';
import { 
  MonitorUp, 
  Presentation, 
  Send, 
  Coffee, 
  Type, 
  Contrast, 
  Zap,
  CheckSquare,
  List,
} from 'lucide-react';

interface TrainerToolsPanelProps {
  sessionId: string;
  onScreenShare: () => void;
  onSendResource: () => void;
  onStartBreak: () => void;
}

export default function TrainerToolsPanel({
  sessionId,
  onScreenShare,
  onSendResource,
  onStartBreak,
}: TrainerToolsPanelProps) {
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklist, setChecklist] = useState([
    { id: '1', label: 'Welcome & accessibility check', done: false },
    { id: '2', label: 'Review last session outcomes', done: false },
    { id: '3', label: 'Share today\'s agenda', done: false },
    { id: '4', label: 'Check-in with trainees', done: false },
    { id: '5', label: 'First break reminder (45 min)', done: false },
    { id: '6', label: 'Activity / Exercise', done: false },
    { id: '7', label: 'Q&A / Discussion', done: false },
    { id: '8', label: 'Recap key points', done: false },
    { id: '9', label: 'Homework / Next steps', done: false },
    { id: '10', label: 'Closing & feedback', done: false },
  ]);

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, done: !item.done } : item
    ));
  };

  const completedCount = checklist.filter(c => c.done).length;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-calm-800 mb-4">
        Trainer Tools
      </h3>

      {/* Big Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={onScreenShare}
          className="btn btn-lg bg-primary-100 text-primary-700 hover:bg-primary-200 flex-col py-4"
        >
          <MonitorUp size={24} className="mb-1" />
          <span className="text-sm">Share Screen</span>
        </button>

        <button
          onClick={() => {/* Open slides */}}
          className="btn btn-lg bg-primary-100 text-primary-700 hover:bg-primary-200 flex-col py-4"
        >
          <Presentation size={24} className="mb-1" />
          <span className="text-sm">Open Slides</span>
        </button>

        <button
          onClick={onSendResource}
          className="btn btn-lg bg-success-100 text-success-700 hover:bg-success-200 flex-col py-4"
        >
          <Send size={24} className="mb-1" />
          <span className="text-sm">Send Resource</span>
        </button>

        <button
          onClick={onStartBreak}
          className="btn btn-lg bg-warning-100 text-warning-700 hover:bg-warning-200 flex-col py-4"
        >
          <Coffee size={24} className="mb-1" />
          <span className="text-sm">Start Break</span>
        </button>
      </div>

      {/* Session Checklist */}
      <div className="border-t border-calm-200 pt-4">
        <button
          onClick={() => setShowChecklist(!showChecklist)}
          className="w-full flex items-center justify-between text-left"
        >
          <span className="flex items-center gap-2 font-medium text-calm-700">
            <CheckSquare size={18} />
            Session Checklist
          </span>
          <span className="text-sm text-calm-500">
            {completedCount}/{checklist.length}
          </span>
        </button>

        {showChecklist && (
          <div className="mt-3 space-y-2">
            {checklist.map(item => (
              <label 
                key={item.id}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  item.done ? 'bg-success-50' : 'hover:bg-calm-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleChecklistItem(item.id)}
                  className="w-5 h-5 rounded border-calm-300 text-primary-600 focus:ring-primary-500"
                />
                <span className={`text-sm ${item.done ? 'text-calm-500 line-through' : 'text-calm-700'}`}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-2 bg-calm-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-success-500 transition-all duration-300"
              style={{ width: `${(completedCount / checklist.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Accessibility Tools */}
      <div className="border-t border-calm-200 pt-4 mt-4">
        <p className="text-sm font-medium text-calm-600 mb-2">Quick Accessibility</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary text-xs">
            <Type size={14} className="mr-1" /> Larger Text
          </button>
          <button className="btn-secondary text-xs">
            <Contrast size={14} className="mr-1" /> High Contrast
          </button>
          <button className="btn-secondary text-xs">
            <Zap size={14} className="mr-1" /> Reduce Motion
          </button>
        </div>
      </div>
    </div>
  );
}
