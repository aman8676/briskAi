import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function AuthPage({ onDone, onBackToLanding, request, theme, toggleTheme }) {
  const resetToken = new URLSearchParams(window.location.search).get('reset_token');
  const [mode, setMode] = useState(resetToken ? 'reset' : 'login');
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const isDark = theme === 'dark';

  const setModeAndClear = (nextMode) => {
    setMode(nextMode);
    setError('');
    setSuccess('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        await request('/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        setSuccess('Account created! Please verify your email, then sign in.');
        setMode('login');
        return;
      }

      if (mode === 'forgot') {
        await request('/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email }),
        });
        setSuccess('If an account exists for that email, a password reset link has been dispatched.');
        return;
      }

      if (mode === 'reset') {
        if (form.password !== form.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        await request('/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, new_password: form.password }),
        });
        window.history.replaceState({}, '', window.location.pathname);
        setSuccess('Password updated successfully! You can now log in.');
        setMode('login');
        return;
      }

      // Login
      const token = await request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      localStorage.setItem('rag_token', token.access_token);
      onDone();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    login: {
      tag: 'WELCOME BACK',
      title: 'Sign in to RAG Studio',
      sub: 'Access your document intelligence pipelines and vector chats.',
      btn: 'Sign in to Workspace',
    },
    signup: {
      tag: 'CREATE ACCOUNT',
      title: 'Build your Knowledge Engine',
      sub: 'Ingest documents, track chunk embeddings, and query models with verifiable facts.',
      btn: 'Create Free Account',
    },
    forgot: {
      tag: 'ACCOUNT RECOVERY',
      title: 'Reset your password',
      sub: "Enter your registered email address and we'll send verification credentials.",
      btn: 'Send Reset Link',
    },
    reset: {
      tag: 'SET NEW CREDENTIALS',
      title: 'Choose a new password',
      sub: 'Enter and confirm your updated secure password.',
      btn: 'Update Password',
    },
  };

  const current = titles[mode];

  return (
    <main
      className={`min-h-screen flex flex-col justify-between p-4 sm:p-8 transition-colors duration-300 ${
        isDark ? 'bg-[#030509] text-white' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2">
        <button
          onClick={onBackToLanding}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
            isDark
              ? 'border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700'
              : 'border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-200'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <div className="flex items-center gap-3">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </header>

      {/* Center Auth Card */}
      <div className="flex-1 flex items-center justify-center py-6">
        <div
          className={`w-full max-w-4xl overflow-hidden rounded-3xl border shadow-2xl transition-all duration-300 grid md:grid-cols-12 ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 shadow-indigo-950/20'
              : 'bg-white border-slate-200 shadow-slate-200'
          }`}
        >
          {/* Left Hero Side */}
          <div
            className={`md:col-span-5 p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden ${
              isDark
                ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-r border-slate-800'
                : 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white'
            }`}
          >
            {/* Background glowing shapes */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase border border-indigo-400/30 bg-indigo-500/10 text-indigo-300">
                <Sparkles className="w-3.5 h-3.5" />
                ◈ RAG STUDIO
              </div>

              <h2 className="mt-8 text-2xl sm:text-3xl font-bold tracking-tight">
                Verified Document Intelligence
              </h2>
              <p className={`mt-3 text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-indigo-100'}`}>
                Connect Google Gemini embeddings, PostgreSQL vectors, CrossEncoders, and Groq LLMs to audit chunk precision and eliminate hallucinations.
              </p>
            </div>

            <div className="relative z-10 mt-8 space-y-3">
              <div className="flex items-center gap-3 text-xs font-medium">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span>Isolated User Document Vaults</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Zap className="w-4 h-4" />
                </div>
                <span>Sub-50ms Hybrid Vector Retrieval</span>
              </div>
            </div>
          </div>

          {/* Right Form Side */}
          <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
            {/* Mode Switch Tabs */}
            {(mode === 'login' || mode === 'signup') && (
              <div
                className={`flex p-1 rounded-xl mb-6 border ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setModeAndClear('login')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                    mode === 'login'
                      ? isDark
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white text-indigo-600 shadow-sm'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setModeAndClear('signup')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                    mode === 'signup'
                      ? isDark
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white text-indigo-600 shadow-sm'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Create account
                </button>
              </div>
            )}

            <div>
              <span className="text-xs font-bold tracking-wider uppercase text-indigo-500">
                {current.tag}
              </span>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">{current.title}</h1>
              <p className={`mt-1 text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {current.sub}
              </p>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type="text"
                      placeholder="e.g. aman_dev"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm border outline-none transition-all ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600 focus:bg-white'
                      }`}
                    />
                  </div>
                </div>
              )}

              {mode !== 'reset' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type="email"
                      placeholder="name@company.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm border outline-none transition-all ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600 focus:bg-white'
                      }`}
                    />
                  </div>
                </div>
              )}

              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider opacity-80">
                      {mode === 'reset' ? 'New Password' : 'Password'}
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setModeAndClear('forgot')}
                        className="text-xs text-indigo-500 hover:text-indigo-400 font-medium"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className={`w-full pl-10 pr-11 py-3 rounded-xl text-sm border outline-none transition-all ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600 focus:bg-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'reset' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm border outline-none transition-all ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600 focus:bg-white'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Feedback messages */}
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  current.btn
                )}
              </button>

              {(mode === 'forgot' || mode === 'reset') && (
                <button
                  type="button"
                  onClick={() => {
                    window.history.replaceState({}, '', window.location.pathname);
                    setModeAndClear('login');
                  }}
                  className="w-full text-center text-xs text-indigo-400 hover:underline pt-2"
                >
                  Return to sign in
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto text-center py-4 text-xs text-slate-500">
        ◈ RAG Studio • Fully localized, zero cloud telemetry data pipeline.
      </footer>
    </main>
  );
}
