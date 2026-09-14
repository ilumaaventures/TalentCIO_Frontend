import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Building2,
  Phone,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  Zap,
  TrendingUp,
  AlertCircle,
  KeyRound,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

export const AuthPage = ({ initialMode = 'login' }) => {
  const { login, register, isLoading } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Feedback State
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!loginEmail || !loginPassword) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    const result = await login(loginEmail.trim(), loginPassword);
    if (!result.success) {
      setErrorMessage(result.message || 'Invalid email or password. Please try again.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!regName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!regEmail.trim()) {
      setErrorMessage('Please enter your work email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    const result = await register({
      name: regName.trim(),
      email: regEmail.trim(),
      companyName: regCompany.trim(),
      phone: regPhone.trim(),
      password: regPassword,
    });

    if (!result.success) {
      setErrorMessage(result.message || 'Failed to create account. Please try again.');
    } else {
      setSuccessMessage('Account created successfully! Redirecting to workspace...');
    }
  };

  // Demo user helper
  const handleQuickDemoFill = (email, pass = 'Password@123') => {
    setMode('login');
    setLoginEmail(email);
    setLoginPassword(pass);
    setErrorMessage('');
  };

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-100 flex flex-col lg:flex-row antialiased overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* LEFT SIDE: Brand Showcase & Enterprise Value Props */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 p-6 xl:p-10 flex-col justify-between overflow-hidden border-r border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 relative">
        {/* Ambient Glow Effects */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-semibold tracking-wide">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Enterprise Sales Suite 2.0</span>
          </div>

          <div className="mt-4 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-white leading-tight">
                Sales Hub <span className="text-indigo-400 font-semibold">Enterprise</span>
              </h1>
              <p className="text-[11px] text-slate-400">High-Velocity Revenue Operating System</p>
            </div>
          </div>

          <div className="mt-6 max-w-md">
            <h2 className="text-xl xl:text-2xl font-extrabold tracking-tight text-white leading-snug">
              Close more deals with data-driven pipeline intelligence.
            </h2>
            <p className="mt-2 text-xs xl:text-sm text-slate-300/85 leading-relaxed">
              Equip your sales team with automated lead qualification, visual opportunity tracking, interactive forecasting, and built-in AI copilot.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="mt-6 space-y-2.5 max-w-md">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white leading-none">Visual Sales Pipeline & Kanban</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Real-time deal stage progression, probability weighting, and revenue forecasting.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white leading-none">Enterprise Role-Based Security (RBAC)</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Bank-grade JWT authentication, granular user permissions, and tamper-proof security audit logging.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white leading-none">AI Sales Assistant & Insights</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Predict deal closure odds, spot stalled opportunities, and automate high-touch outreach.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="relative z-10 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>256-bit SSL Encrypted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Multi-Tenant Architecture</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Auth Card (Sign In / Register) - Fit within 100vh */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 flex items-center justify-center bg-slate-900/40 relative overflow-y-auto lg:overflow-hidden">
        <div className="w-full max-w-md lg:max-w-lg my-auto">
          {/* Card Wrapper */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/40 backdrop-blur-md">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 mb-3.5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Title & Subtitle */}
            <div className="mb-3.5">
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-tight">
                {mode === 'login' ? 'Welcome back to Sales Hub' : 'Create your sales workspace'}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {mode === 'login'
                  ? 'Enter your credentials to access your organization dashboard.'
                  : 'Start capturing leads and closing deals with your team today.'}
              </p>
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div className="mb-3 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span className="leading-tight">{errorMessage}</span>
              </div>
            )}

            {/* Success Message Box */}
            {successMessage && (
              <div className="mb-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span className="leading-tight">{successMessage}</span>
              </div>
            )}

            {/* -------------------- SIGN IN FORM -------------------- */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="e.g. aditya@company.in"
                      className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-300">
                      Password <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] text-indigo-400 hover:underline cursor-pointer">
                      Forgot password?
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-8 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-3 h-3 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                    />
                    <span className="text-[11px] text-slate-400">Remember me</span>
                  </label>
                </div>

                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Sign In to CRM</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>

                {/* Quick Demo Logins Helper */}
                <div className="pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-1 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    <KeyRound className="w-3 h-3 text-amber-400" />
                    <span>Quick Fill Demo Credentials</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickDemoFill('admin@salescrm.com')}
                      className="p-1.5 text-left rounded-lg bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <p className="font-semibold text-slate-200 text-[11px] leading-tight">Org Admin</p>
                      <p className="text-[10px] text-slate-400 truncate">admin@salescrm.com</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDemoFill('rep1@salescrm.com')}
                      className="p-1.5 text-left rounded-lg bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <p className="font-semibold text-slate-200 text-[11px] leading-tight">Sales Executive</p>
                      <p className="text-[10px] text-slate-400 truncate">rep1@salescrm.com</p>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* -------------------- CREATE ACCOUNT (REGISTER) FORM: 2 COLUMNS FIT -------------------- */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">
                      Full Name <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Ramesh Gupta"
                        className="w-full bg-slate-950/70 border border-slate-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">
                      Work Email <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="ramesh@company.in"
                        className="w-full bg-slate-950/70 border border-slate-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">
                      Company Name
                    </label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={regCompany}
                        onChange={(e) => setRegCompany(e.target.value)}
                        placeholder="Gupta Enterprises"
                        className="w-full bg-slate-950/70 border border-slate-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+91 98200 12345"
                        className="w-full bg-slate-950/70 border border-slate-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">
                      Password <span className="text-rose-400">*</span> (min 6)
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full bg-slate-950/70 border border-slate-700/80 rounded-lg pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showRegPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">
                      Confirm Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full bg-slate-950/70 border border-slate-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-snug">
                  By creating an account, you agree to the CRM Terms. New accounts are assigned Org Admin privileges.
                </p>

                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Create Account & Launch Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </form>
            )}

            {/* Toggle Mode footer link */}
            <div className="mt-3.5 text-center text-[11px] text-slate-400">
              {mode === 'login' ? (
                <p>
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMessage('');
                    }}
                    className="text-indigo-400 font-bold hover:underline cursor-pointer ml-1"
                  >
                    Create an account
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage('');
                    }}
                    className="text-indigo-400 font-bold hover:underline cursor-pointer ml-1"
                  >
                    Sign in here
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
