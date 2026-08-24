import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, AlertCircle, Loader2, X } from 'lucide-react';

export const LoginSignup: React.FC = () => {
  const { login, signup, loginWithGoogle, enterGuestMode, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [studioName, setStudioName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [googleModalOpen, setGoogleModalOpen] = useState<boolean>(false);

  // If already authenticated, redirect to home
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignup) {
        await signup(
          email,
          password,
          name || email.split('@')[0],
          studioName || 'Ergon Studio'
        );
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async (customEmail?: string, customName?: string) => {
    setLoading(true);
    setGoogleModalOpen(false);
    try {
      await loginWithGoogle(
        customEmail || 'designer.google@gmail.com',
        customName || 'Google User'
      );
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = async () => {
    setLoading(true);
    try {
      await enterGuestMode();
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Could not start guest mode.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-page flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-accent-blue selection:text-white transition-colors duration-200">
      {/* Subtle Guest Mode link in Top Right Corner */}
      <div className="absolute top-5 right-6 sm:top-7 sm:right-8">
        <button
          type="button"
          onClick={handleGuestMode}
          className="text-xs text-text-secondary hover:text-text-primary transition-colors font-mono tracking-tight cursor-pointer opacity-70 hover:opacity-100 hover:underline"
          title="Launch demo studio with dummy clients and sample invoices"
        >
          (guest mode)
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Logo */}
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/25 mb-4">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="text-white">
            <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="2.4" />
            <path
              d="M9 15L15 9M15 9H10M15 9V14"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-text-primary">
          ergon
        </h1>
        <p className="mt-1 text-sm font-medium text-text-secondary">
          Freelance studio client, quote & profitability manager
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-card rounded-card shadow-ergon-card border border-border-subtle p-7 sm:p-9 transition-colors duration-200">
          {/* Continue with Google Button */}
          <button
            type="button"
            onClick={() => setGoogleModalOpen(true)}
            disabled={loading}
            className="w-full py-3 px-4 rounded-input bg-card-alt hover:bg-neutral-100 dark:hover:bg-neutral-800/60 border border-border-subtle text-text-primary font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 mb-5"
          >
            {/* Google SVG Logo */}
            <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-border-subtle w-full" />
            <span className="bg-card px-3 text-[11px] font-bold text-text-secondary uppercase tracking-wider absolute">
              or with email
            </span>
          </div>

          {/* Mode Switcher Pills */}
          <div className="flex bg-card-alt border border-border-subtle p-1 rounded-full mb-6">
            <button
              type="button"
              onClick={() => {
                setIsSignup(false);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer ${
                !isSignup
                  ? 'bg-neutral-900 text-white dark:bg-neutral-800 dark:text-white dark:border dark:border-neutral-700 shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignup(true);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer ${
                isSignup
                  ? 'bg-neutral-900 text-white dark:bg-neutral-800 dark:text-white dark:border dark:border-neutral-700 shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jordan Hayes"
                    className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-text-primary text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                    Studio / Freelance Name
                  </label>
                  <input
                    type="text"
                    required
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    placeholder="e.g. Hayes Design Studio"
                    className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-text-primary text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourstudio.com"
                className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-text-primary text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-text-primary text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-6 rounded-pill bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>{isSignup ? 'Create Studio Account' : 'Sign In to Studio'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Bottom Corner Guest Mode Callout */}
        <div className="text-center mt-5">
          <button
            type="button"
            onClick={handleGuestMode}
            className="text-[11px] text-text-secondary hover:text-text-primary font-mono tracking-tight transition-colors cursor-pointer"
          >
            Just exploring? Click here for <span className="underline font-bold">(guest mode)</span> with dummy data
          </button>
        </div>
      </div>

      {/* Google Account Modal Simulator */}
      {googleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card rounded-card shadow-ergon-float p-6 sm:p-7 max-w-sm w-full border border-border-subtle">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span className="text-xs font-bold text-text-primary">Sign in with Google</span>
              </div>
              <button
                type="button"
                onClick={() => setGoogleModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-text-secondary hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-secondary mb-4">
              Choose an account to continue to <strong>Ergon Studio</strong>
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() =>
                  handleGoogleAuth('designer.google@gmail.com', 'Alex Studio')
                }
                className="w-full p-3 rounded-2xl bg-card-alt hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-border-subtle text-left flex items-center gap-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  A
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-text-primary">Alex Studio</div>
                  <div className="text-[11px] text-text-secondary truncate">
                    designer.google@gmail.com
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleGoogleAuth('creative.director@gmail.com', 'Creative Director')
                }
                className="w-full p-3 rounded-2xl bg-card-alt hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-border-subtle text-left flex items-center gap-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  C
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-text-primary">Creative Director</div>
                  <div className="text-[11px] text-text-secondary truncate">
                    creative.director@gmail.com
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-border-subtle flex justify-end">
              <button
                type="button"
                onClick={() => setGoogleModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
