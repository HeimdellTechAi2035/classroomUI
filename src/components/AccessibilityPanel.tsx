import { useAppStore } from '../store/appStore';
import { X, Type, Contrast, Zap, Subtitles } from 'lucide-react';

interface AccessibilityPanelProps {
  onClose: () => void;
}

export default function AccessibilityPanel({ onClose }: AccessibilityPanelProps) {
  const { accessibility, setAccessibility } = useAppStore();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="accessibility-title"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="accessibility-title" className="text-xl font-semibold text-calm-900">
            Accessibility Settings
          </h2>
          <button
            onClick={onClose}
            className="btn-icon"
            aria-label="Close accessibility settings"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Font Size */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-calm-700 mb-3">
              <Type size={18} />
              Text Size
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['normal', 'large', 'extra-large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setAccessibility({ fontSize: size })}
                  className={`py-3 px-4 rounded-lg border-2 transition-colors ${
                    accessibility.fontSize === size
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-calm-200 hover:border-calm-300'
                  }`}
                >
                  <span className={`block ${
                    size === 'normal' ? 'text-sm' : size === 'large' ? 'text-base' : 'text-lg'
                  }`}>
                    {size === 'normal' ? 'Normal' : size === 'large' ? 'Large' : 'Extra Large'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* High Contrast */}
          <div className="flex items-center justify-between py-3 border-t border-calm-200">
            <label htmlFor="high-contrast" className="flex items-center gap-2 text-calm-700">
              <Contrast size={18} />
              <span>High Contrast Mode</span>
            </label>
            <button
              id="high-contrast"
              role="switch"
              aria-checked={accessibility.highContrast}
              onClick={() => setAccessibility({ highContrast: !accessibility.highContrast })}
              className={`w-12 h-6 rounded-full transition-colors ${
                accessibility.highContrast ? 'bg-primary-600' : 'bg-calm-300'
              }`}
            >
              <span 
                className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  accessibility.highContrast ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Reduce Motion */}
          <div className="flex items-center justify-between py-3 border-t border-calm-200">
            <label htmlFor="reduce-motion" className="flex items-center gap-2 text-calm-700">
              <Zap size={18} />
              <span>Reduce Motion</span>
            </label>
            <button
              id="reduce-motion"
              role="switch"
              aria-checked={accessibility.reduceMotion}
              onClick={() => setAccessibility({ reduceMotion: !accessibility.reduceMotion })}
              className={`w-12 h-6 rounded-full transition-colors ${
                accessibility.reduceMotion ? 'bg-primary-600' : 'bg-calm-300'
              }`}
            >
              <span 
                className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  accessibility.reduceMotion ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Captions */}
          <div className="flex items-center justify-between py-3 border-t border-calm-200">
            <label htmlFor="captions" className="flex items-center gap-2 text-calm-700">
              <Subtitles size={18} />
              <span>Live Captions / Notes Panel</span>
            </label>
            <button
              id="captions"
              role="switch"
              aria-checked={accessibility.captionsEnabled}
              onClick={() => setAccessibility({ captionsEnabled: !accessibility.captionsEnabled })}
              className={`w-12 h-6 rounded-full transition-colors ${
                accessibility.captionsEnabled ? 'bg-primary-600' : 'bg-calm-300'
              }`}
            >
              <span 
                className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  accessibility.captionsEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-calm-200">
          <p className="text-sm text-calm-500">
            These settings are saved automatically and will persist across sessions.
            You can access these controls from the sidebar or top bar at any time.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 btn-primary"
        >
          Done
        </button>
      </div>
    </div>
  );
}
