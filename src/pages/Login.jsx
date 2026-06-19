import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, CheckCircle2, Eye, EyeOff, Sparkles, Shield, BarChart3, KeyRound, X, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import api from '../api/axios';

const MotionDiv = motion.div;
const normalizeEmail = (value) => value.trim().toLowerCase();
const LOGIN_TOAST_ID = 'workspace-login';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(0); // 0: login, 1: enter email, 2: verify OTP, 3: enter new password, 4: success
  const [forgotEmail, setForgotEmail] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);

  // States from OTPReset
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [timer, setTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let interval;
    if (forgotStep === 2 && timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer, forgotStep]);

  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus next input if a value is entered
    if (element.value && element.nextSibling) {
      element.nextSibling.focus();
    }
  };

  const handleForgotPasswordClick = () => {
    if (email) {
      setForgotEmail(email);
    }
    setForgotStep(1);
  };

  const handleSendForgotOtp = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setSendingOtp(true);
    try {
      await api.post('/auth/resend-otp', { email: normalizeEmail(forgotEmail) });
      toast.success("Password reset OTP sent to your email.");
      setTimer(60);
      setOtp(['', '', '', '', '', '']);
      setForgotStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP. Please check the email.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendForgotOtp = async () => {
    setIsResending(true);
    try {
      await api.post('/auth/resend-otp', { email: normalizeEmail(forgotEmail) });
      toast.success("A new OTP has been sent to your email.");
      setTimer(60);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resend OTP");
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyForgotOtp = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      toast.error("Please enter the full 6-digit OTP");
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/auth/verify-otp', {
        email: normalizeEmail(forgotEmail),
        otp: otpCode
      });
      toast.success("OTP verified successfully!");
      setNewPassword('');
      setConfirmPassword('');
      setForgotStep(3);
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const validatePassword = (pwd) => {
    const minLength = pwd.length >= 8;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    return minLength && hasUpper && hasNumber && hasSpecial;
  };

  const handleResetPasswordInline = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!validatePassword(newPassword)) {
      toast.error("Password must be at least 8 characters long, contain at least one capital letter, one number, and one special character.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/verify-otp-reset', {
        email: normalizeEmail(forgotEmail),
        otp: otp.join(''),
        newPassword
      });
      toast.success("Password reset successfully!");
      setForgotStep(4);
      setTimeout(() => {
        setForgotStep(0);
        setEmail(forgotEmail);
        setPassword('');
        setForgotEmail('');
        setOtp(['', '', '', '', '', '']);
        setNewPassword('');
        setConfirmPassword('');
      }, 3000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
      if (error.response?.status === 400) {
        setForgotStep(2); // Go back to OTP if it was invalid
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    toast.dismiss(LOGIN_TOAST_ID);
    try {
      const data = await login(normalizeEmail(email), password);

      if (data?.passwordResetRequired) {
        toast.success("Identity verification required", { id: LOGIN_TOAST_ID });
        setForgotEmail(data.email);
        setTimer(60);
        setOtp(['', '', '', '', '', '']);
        setForgotStep(2); // Go directly to Step 2 (Verify OTP)
        return;
      }

      toast.success("Welcome back!", { id: LOGIN_TOAST_ID });
      navigate('/');
    } catch (error) {
      const message = error.response?.data?.message
        || error.message
        || 'Login Failed';
      toast.error(message, { id: LOGIN_TOAST_ID });
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: BarChart3, label: 'Smart Analytics', desc: 'Data-driven workforce insights' },
    { icon: Sparkles, label: 'Automated Workflows', desc: 'Streamline HR operations' },
    { icon: Shield, label: '360° People View', desc: 'Complete talent visibility' },
  ];

  return (
    <div className="min-h-screen flex bg-white font-sans overflow-hidden">
      {/* ── Left Hero Panel ── */}
      <div className="hidden lg:flex w-[55%] relative items-center justify-center overflow-hidden">
        {/* Deep navy gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#152244] to-[#1e3a5f]" />

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Animated gradient orbs */}
        <MotionDiv
          animate={{ scale: [1, 1.15, 1], x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-20 w-[420px] h-[420px] rounded-full blur-[100px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)' }}
        />
        <MotionDiv
          animate={{ scale: [1, 1.2, 1], x: [0, -25, 0], y: [0, 30, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute bottom-10 right-[-60px] w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)' }}
        />
        <MotionDiv
          animate={{ scale: [1, 1.1, 1], rotate: [0, 8, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 6 }}
          className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full blur-[100px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.2) 0%, transparent 70%)' }}
        />

        {/* Content */}
        <div className="relative z-10 px-14 py-16 max-w-xl w-full">
          {/* Logo */}
          <MotionDiv
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="mb-14"
          >
            <div className="flex items-center gap-3">
              <img src="/dark-logo-full.png" alt="TalentCIO" className="h-25 w-auto max-w-[320px] object-contain" />
            </div>
          </MotionDiv>

          {/* Headline */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            <h1 className="text-[2.75rem] leading-[1.1] font-extrabold text-white tracking-tight mb-5">
              Empower Your
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                Workforce.
              </span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-md mb-12">
              Streamline HR operations with intelligent talent management — from hiring to performance, all in one platform.
            </p>
          </MotionDiv>

          {/* Feature Cards — Glassmorphic */}
          <div className="space-y-3">
            {features.map((feat, idx) => (
              <MotionDiv
                key={feat.label}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + idx * 0.12, duration: 0.5 }}
                className="group flex items-center gap-4 px-5 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300 cursor-default"
              >
                <div className="h-9 w-9 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0 group-hover:bg-blue-500/25 transition-colors">
                  <feat.icon size={18} className="text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white mb-0.5">{feat.label}</div>
                  <div className="text-xs text-slate-500">{feat.desc}</div>
                </div>
              </MotionDiv>
            ))}
          </div>


        </div>
      </div>

      {/* ── Right Login Form Panel ── */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-12 bg-white relative">
        {/* Subtle background accent */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[160px] pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)' }}
        />

        <MotionDiv
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="w-full max-w-[400px] relative z-10"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <img src="/talentcio-logo.png" alt="TalentCIO" className="h-11 w-auto max-w-[250px] object-contain" />
          </div>

          {/* Heading */}
          <div className="mb-10">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
              {forgotStep === 0 ? "Welcome back" :
               forgotStep === 1 ? "Forgot Password" :
               forgotStep === 2 ? "Verify Identity" :
               forgotStep === 3 ? "Security Update" : "Success"}
            </h2>
            <p className="text-slate-500 text-sm">
              {forgotStep === 0 ? "Sign in to your workspace to continue." :
               forgotStep === 1 ? "Enter your workspace email address below and we'll send you a 6-digit OTP to reset your password." :
               forgotStep === 2 ? `We've sent a 6-digit verification code to ${forgotEmail}` :
               forgotStep === 3 ? "Your identity is verified. Please set a strong new password to secure your account." : ""}
            </p>
          </div>

          {/* Form container */}
          <AnimatePresence mode="wait">
            {forgotStep === 0 && (
              <MotionDiv
                key="login-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <form className="space-y-5" onSubmit={handleSubmit}>
                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email-address"
                      className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className={`h-[18px] w-[18px] transition-colors duration-200 ${focusedInput === 'email' ? 'text-blue-600' : 'text-slate-400'}`} />
                      </div>
                      <input
                        id="email-address"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value.toLowerCase())}
                        onFocus={() => setFocusedInput('email')}
                        onBlur={() => setFocusedInput(null)}
                        className={`block w-full py-3.5 pl-11 pr-4 rounded-xl text-sm text-slate-900 bg-slate-50/80 border-2 placeholder:text-slate-400 outline-none transition-all duration-200
                          ${focusedInput === 'email'
                            ? 'border-blue-600 bg-white ring-4 ring-blue-600/10 shadow-sm'
                            : 'border-slate-200/80 hover:border-slate-300'}`}
                        placeholder="you@company.com"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label
                        htmlFor="password"
                        className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={handleForgotPasswordClick}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className={`h-[18px] w-[18px] transition-colors duration-200 ${focusedInput === 'password' ? 'text-blue-600' : 'text-slate-400'}`} />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedInput('password')}
                        onBlur={() => setFocusedInput(null)}
                        className={`block w-full py-3.5 pl-11 pr-12 rounded-xl text-sm text-slate-900 bg-slate-50/80 border-2 placeholder:text-slate-400 outline-none transition-all duration-200
                          ${focusedInput === 'password'
                            ? 'border-blue-600 bg-white ring-4 ring-blue-600/10 shadow-sm'
                            : 'border-slate-200/80 hover:border-slate-300'}`}
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      whileHover={{ scale: isLoading ? 1 : 1.01 }}
                      whileTap={{ scale: isLoading ? 1 : 0.99 }}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/25 hover:shadow-blue-700/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-blue-600/20"
                    >
                      {isLoading ? (
                        <Loader2 className="animate-spin h-5 w-5 text-white" />
                      ) : (
                        <>
                          Sign In
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </MotionDiv>
            )}

            {forgotStep === 1 && (
              <MotionDiv
                key="forgot-email-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <form className="space-y-5" onSubmit={handleSendForgotOtp}>
                  {/* Email */}
                  <div>
                    <label
                      htmlFor="forgot-email"
                      className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className={`h-[18px] w-[18px] transition-colors duration-200 ${focusedInput === 'forgotEmail' ? 'text-blue-600' : 'text-slate-400'}`} />
                      </div>
                      <input
                        id="forgot-email"
                        name="forgotEmail"
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value.toLowerCase())}
                        onFocus={() => setFocusedInput('forgotEmail')}
                        onBlur={() => setFocusedInput(null)}
                        className={`block w-full py-3.5 pl-11 pr-4 rounded-xl text-sm text-slate-900 bg-slate-50/80 border-2 placeholder:text-slate-400 outline-none transition-all duration-200
                          ${focusedInput === 'forgotEmail'
                            ? 'border-blue-600 bg-white ring-4 ring-blue-600/10 shadow-sm'
                            : 'border-slate-200/80 hover:border-slate-300'}`}
                        placeholder="you@company.com"
                      />
                    </div>
                  </div>

                  {/* Submit & Cancel Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => { setForgotStep(0); setForgotEmail(''); }}
                      className="flex-1 py-3.5 px-6 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    >
                      Cancel
                    </button>
                    <motion.button
                      type="submit"
                      disabled={sendingOtp}
                      whileHover={{ scale: sendingOtp ? 1 : 1.01 }}
                      whileTap={{ scale: sendingOtp ? 1 : 0.99 }}
                      className="flex-[2] flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/25 hover:shadow-blue-700/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-blue-600/20"
                    >
                      {sendingOtp ? (
                        <Loader2 className="animate-spin h-5 w-5 text-white" />
                      ) : (
                        <>
                          Send OTP
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </MotionDiv>
            )}

            {forgotStep === 2 && (
              <MotionDiv
                key="forgot-otp-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <form onSubmit={handleVerifyForgotOtp} className="space-y-6">
                  <div className="flex justify-center gap-2">
                    {otp.map((data, index) => (
                      <input
                        key={index}
                        type="text"
                        maxLength="1"
                        value={data}
                        onChange={e => handleOtpChange(e.target, index)}
                        onFocus={e => e.target.select()}
                        className="w-10 h-12 text-center text-xl font-bold bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:bg-white focus:outline-none transition-all"
                      />
                    ))}
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: isLoading ? 1 : 1.01 }}
                    whileTap={{ scale: isLoading ? 1 : 0.99 }}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/25 hover:shadow-blue-700/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-blue-600/20"
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin h-5 w-5 text-white" />
                    ) : (
                      <>
                        Verify OTP
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </motion.button>
                </form>

                <div className="text-center space-y-4">
                  <p className="text-xs text-slate-400">
                    Didn't receive the code? {timer > 0 ? (
                      <span className="text-blue-600 font-medium">Resend in {timer}s</span>
                    ) : (
                      <button
                        onClick={handleResendForgotOtp}
                        disabled={isResending}
                        className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1 focus:outline-none"
                      >
                        {isResending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Resend Now
                      </button>
                    )}
                  </p>
                  <button
                    onClick={() => { setForgotStep(1); }}
                    className="text-slate-500 text-xs hover:text-slate-800 transition-colors focus:outline-none"
                  >
                    Back
                  </button>
                </div>
              </MotionDiv>
            )}

            {forgotStep === 3 && (
              <MotionDiv
                key="forgot-password-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={handleResetPasswordInline} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:bg-white focus:outline-none transition-all text-slate-900 text-sm"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:bg-white focus:outline-none transition-all text-slate-900 text-sm"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: isLoading ? 1 : 1.01 }}
                    whileTap={{ scale: isLoading ? 1 : 0.99 }}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/25 hover:shadow-blue-700/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-blue-600/20"
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin h-5 w-5 text-white" />
                    ) : (
                      <>
                        Update Password & Login
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </motion.button>
                </form>
              </MotionDiv>
            )}

            {forgotStep === 4 && (
              <MotionDiv
                key="forgot-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-4 py-4"
              >
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Password Updated!</h3>
                <p className="text-slate-500 text-xs max-w-xs mx-auto">
                  Your password has been successfully reset. Returning to the login screen...
                </p>
                <div className="flex justify-center pt-2">
                  <Loader2 className="animate-spin text-blue-600" size={20} />
                </div>
              </MotionDiv>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-slate-100">
            <p className="text-[11px] text-center text-slate-400 font-medium">
              Powered by <span className="font-semibold text-slate-500">TalentCIO</span> · Secure Enterprise Login
            </p>
          </div>
        </MotionDiv>

      </div>
    </div>
  );
};

export default Login;
