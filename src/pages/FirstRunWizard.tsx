import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { HardDrive, Folder, Check, ArrowRight, Shield, Database, Zap, Sparkles } from 'lucide-react';

type Step = 'welcome' | 'storage' | 'complete';

export default function FirstRunWizard() {
  const { completeSetup } = useAppStore();
  const [step, setStep] = useState<Step>('welcome');
  const [storageMode, setStorageMode] = useState<'portable' | 'custom'>('portable');
  const [customPath, setCustomPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectFolder = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectFolder();
      if (path) {
        setCustomPath(path);
      }
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.setConfig('portableMode', storageMode === 'portable');
        if (storageMode === 'custom' && customPath) {
          await window.electronAPI.setConfig('dataPath', customPath);
        }
      }
      await completeSetup();
    } catch (error) {
      console.error('Setup failed:', error);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-calm-50 via-white to-primary-50 flex items-center justify-center p-8">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary-500/10 to-accent-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-accent-500/10 to-primary-500/10 rounded-full blur-3xl" />
      </div>
      
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-calm-200/50 relative">
        {/* Header */}
        <div className="relative overflow-hidden p-8" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #d946ef 100%)' }}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="flex items-center gap-4 relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
              <Zap className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">RemoteAbility Classroom</h1>
              <p className="text-white/80 font-medium">Welcome to your training platform</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="px-8 py-5 bg-calm-50/50 border-b border-calm-200/50">
          <div className="flex items-center justify-center gap-3">
            {(['welcome', 'storage', 'complete'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold transition-all duration-300 ${
                  step === s 
                    ? 'bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/25' 
                    : ['storage', 'complete'].indexOf(step) > ['welcome', 'storage', 'complete'].indexOf(s)
                      ? 'bg-success-500 text-white shadow-lg shadow-success-500/25' 
                      : 'bg-calm-200 text-calm-500'
                }`}>
                  {['storage', 'complete'].indexOf(step) > ['welcome', 'storage', 'complete'].indexOf(s) 
                    ? <Check size={18} /> : i + 1}
                </div>
                {i < 2 && (
                  <div className={`w-20 h-1.5 mx-3 rounded-full transition-colors duration-300 ${
                    ['storage', 'complete'].indexOf(step) > i 
                      ? 'bg-gradient-to-r from-success-400 to-success-500' 
                      : 'bg-calm-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {step === 'welcome' && (
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-primary-500/10 to-accent-500/10 flex items-center justify-center">
                <Shield size={44} className="text-primary-500" />
              </div>
              <h2 className="text-3xl font-bold text-calm-900 mb-4 tracking-tight">
                Welcome to <span className="text-gradient">RemoteAbility</span>
              </h2>
              <p className="text-calm-500 mb-8 max-w-md mx-auto text-lg">
                A calm, accessible training platform designed for RemoteAbility CIC. 
                Works entirely offline and runs from any drive.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10 text-left">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-calm-50 to-white border border-calm-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-3">
                    <Database size={24} className="text-primary-600" />
                  </div>
                  <h3 className="font-bold text-calm-800 mb-1">Local-First</h3>
                  <p className="text-sm text-calm-500">All data stays on your device. No cloud required.</p>
                </div>
                <div className="p-5 rounded-2xl bg-gradient-to-br from-calm-50 to-white border border-calm-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center mb-3">
                    <HardDrive size={24} className="text-accent-600" />
                  </div>
                  <h3 className="font-bold text-calm-800 mb-1">Portable</h3>
                  <p className="text-sm text-calm-500">Run directly from an external drive.</p>
                </div>
                <div className="p-5 rounded-2xl bg-gradient-to-br from-calm-50 to-white border border-calm-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center mb-3">
                    <Shield size={24} className="text-success-600" />
                  </div>
                  <h3 className="font-bold text-calm-800 mb-1">Secure</h3>
                  <p className="text-sm text-calm-500">Sensitive data is encrypted locally.</p>
                </div>
              </div>

              <button
                onClick={() => setStep('storage')}
                className="btn-primary btn-lg group"
              >
                Get Started 
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}

          {step === 'storage' && (
            <div>
              <h2 className="text-2xl font-bold text-calm-900 mb-2 tracking-tight">
                Choose Storage Location
              </h2>
              <p className="text-calm-500 mb-8">
                Where would you like to store your classroom data?
              </p>

              <div className="space-y-4 mb-10">
                <button
                  onClick={() => setStorageMode('portable')}
                  className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-300 ${
                    storageMode === 'portable' 
                      ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-accent-50/50 shadow-lg shadow-primary-500/10' 
                      : 'border-calm-200 hover:border-calm-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                      storageMode === 'portable' 
                        ? 'bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/25' 
                        : 'bg-calm-100 text-calm-500'
                    }`}>
                      <HardDrive size={26} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-calm-900">Use this drive</h3>
                        <span className="badge-primary text-xs">Recommended</span>
                      </div>
                      <p className="text-sm text-calm-500 mt-1">
                        Store data alongside the app. Perfect for external drives and portable use.
                      </p>
                      {storageMode === 'portable' && (
                        <div className="mt-3 text-sm text-primary-600 flex items-center gap-1.5 font-medium">
                          <Check size={16} /> Portable mode enabled
                        </div>
                      )}
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setStorageMode('custom')}
                  className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-300 ${
                    storageMode === 'custom' 
                      ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-accent-50/50 shadow-lg shadow-primary-500/10' 
                      : 'border-calm-200 hover:border-calm-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                      storageMode === 'custom' 
                        ? 'bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/25' 
                        : 'bg-calm-100 text-calm-500'
                    }`}>
                      <Folder size={26} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-calm-900">Choose a different location</h3>
                      <p className="text-sm text-calm-500 mt-1">
                        Select any folder on your computer to store data.
                      </p>
                      {storageMode === 'custom' && (
                        <div className="mt-3">
                          <button
                            onClick={handleSelectFolder}
                            className="btn-secondary text-sm"
                          >
                            {customPath ? 'Change Folder' : 'Select Folder'}
                          </button>
                          {customPath && (
                            <p className="mt-2 text-sm text-calm-500 truncate">
                              📁 {customPath}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('welcome')}
                  className="btn-secondary"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('complete')}
                  className="btn-primary group"
                  disabled={storageMode === 'custom' && !customPath}
                >
                  Continue <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-success-100 to-success-50 flex items-center justify-center">
                <Check size={44} className="text-success-600" />
              </div>
              <h2 className="text-3xl font-bold text-calm-900 mb-4 tracking-tight">
                You're All Set!
              </h2>
              <p className="text-calm-500 mb-8 max-w-md mx-auto text-lg">
                Your classroom is ready. You can now create cohorts, add trainees, 
                and start running training sessions.
              </p>

              <div className="bg-gradient-to-br from-calm-50 to-white rounded-2xl p-6 mb-10 text-left max-w-md mx-auto border border-calm-100">
                <h3 className="font-bold text-calm-800 mb-4 flex items-center gap-2">
                  <Sparkles size={18} className="text-primary-500" />
                  Quick Start Tips
                </h3>
                <ul className="space-y-3 text-sm text-calm-600">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                    Go to <strong className="text-calm-800">Trainer Toolkit</strong> to set up your first cohort
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                    Add trainees manually or import from CSV
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                    Check <strong className="text-calm-800">Weeks 1-6</strong> to add your training content
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                    Review and customise the <strong className="text-calm-800">Policies</strong> section
                  </li>
                </ul>
              </div>

              <button
                onClick={handleComplete}
                disabled={isLoading}
                className="btn-primary btn-lg group"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Setting up...
                  </>
                ) : (
                  <>
                    Open Classroom <ArrowRight size={20} className="ml-2" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-calm-50 border-t border-calm-200 text-center text-sm text-calm-500">
          © RemoteAbility CIC | Registered Community Interest Company | All rights reserved.
        </div>
      </div>
    </div>
  );
}
