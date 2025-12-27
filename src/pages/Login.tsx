import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, AlertCircle, Users } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Trainer credentials
  const TRAINER_USERNAME = 'TrainerAdmin';
  const TRAINER_PASSWORD = 'RemoteTrainer2026';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate a brief delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    if (username === TRAINER_USERNAME && password === TRAINER_PASSWORD) {
      // Store auth state
      localStorage.setItem('isTrainerAuthenticated', 'true');
      localStorage.setItem('trainerLoginTime', new Date().toISOString());
      navigate('/session');
    } else {
      setError('Invalid username or password');
    }
    
    setIsLoading(false);
  };

  const handleTraineeAccess = () => {
    navigate('/join');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-calm-900">RemoteAbility</h1>
          <p className="text-calm-600 mt-2">Classroom Platform</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-xl p-8 border border-calm-200">
          <h2 className="text-xl font-bold text-calm-900 mb-6 text-center">Trainer Login</h2>
          
          {error && (
            <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger-700 text-sm flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          
          <div className="space-y-5">
            {/* Username Input */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-calm-700 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full px-4 py-3 bg-calm-50 border-2 border-calm-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all"
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-calm-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 bg-calm-50 border-2 border-calm-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all pr-12"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-calm-500 hover:text-calm-700 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:from-calm-400 disabled:to-calm-500 text-white font-semibold rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-primary-500/25 disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Sign In
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-calm-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-calm-500">or</span>
            </div>
          </div>

          {/* Trainee Access */}
          <button
            type="button"
            onClick={handleTraineeAccess}
            className="w-full py-4 border-2 border-accent-300 text-accent-700 hover:bg-accent-50 font-semibold rounded-xl flex items-center justify-center gap-3 transition-all"
          >
            <Users size={20} />
            Join as Trainee
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-calm-500 text-sm mt-6">
          © RemoteAbility CIC | Accessible Training Platform
        </p>
      </div>
    </div>
  );
}
