import React, { useState, useEffect } from 'react';
import { Shield, Lock, Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminLoginPageProps {
  navigate: (page: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ navigate }) => {
  const { adminSignIn, isPlatformAdmin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // If already logged in as authorized admin, redirect inside useEffect
  useEffect(() => {
    if (isPlatformAdmin) {
      navigate('admin-dashboard');
    }
  }, [isPlatformAdmin, navigate]);

  if (isPlatformAdmin) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const result = await adminSignIn(email, password);
      if (result.success) {
        navigate('admin-dashboard');
      } else {
        setErrorMessage(
          result.error ||
            'Access denied. Please ensure your account has administrator credentials and permissions.'
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button
          type="button"
          onClick={() => navigate('home')}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Helping Hands Home</span>
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Administrator Gateway
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Restricted access portal for authorized platform administration and governance.
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/80 text-xs text-rose-300 leading-relaxed">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Administrator Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@helpinghands.org"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none pl-9"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none pl-9"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? 'Verifying Administrator Credentials...' : 'Sign In as Administrator'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
