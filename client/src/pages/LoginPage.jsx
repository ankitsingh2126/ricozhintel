// Sign-in page with demo credentials quick-fill buttons and error feedback.

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import { Lock, Mail, ShieldCheck, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
    setLoading(true);
    try {
      await login({ email: demoEmail, password: demoPassword });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Quick login failed. Ensure demo data has been seeded.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
              R
            </div>
          </div>
          <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
            Sign in to Ricozhintel
          </h2>
          <p className="mt-1 text-center text-sm text-slate-500">
            Operational Intelligence Platform
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-sm text-rose-800">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating…' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Quick Demo Sign-In</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('admin@ricozhintel.internal', 'Admin123!')}
              className="flex flex-col items-center justify-center p-3 border border-slate-200 hover:border-brand-500 hover:bg-brand-50/40 rounded-xl transition-all text-center group cursor-pointer"
            >
              <div className="flex items-center gap-1 text-xs font-bold text-slate-800 group-hover:text-brand-700">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                <span>Demo Admin</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5">Full CRUD Access</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('viewer@ricozhintel.internal', 'Viewer123!')}
              className="flex flex-col items-center justify-center p-3 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-xl transition-all text-center group cursor-pointer"
            >
              <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                <span>Demo Viewer</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5">Read & Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
