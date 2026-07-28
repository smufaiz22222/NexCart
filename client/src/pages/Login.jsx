import { useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck, Sparkles, Truck, CreditCard, Store } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import apiClient from '../api/axios.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  useEffect(() => {
    clearError();
  }, [clearError]);

  const [showOtpVerify, setShowOtpVerify] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [tempVerifyData, setTempVerifyData] = useState(null);
  const [otpError, setOtpError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setOtpError('');
    setSuccessMessage('');
    try {
      const user = await login(email, password);
      if (user.role === 'SUPER_ADMIN') navigate('/admin');
      else if (user.role === 'WHOLESALER') navigate('/wholesaler');
      else navigate('/store');
    } catch (submitError) {
      const errMsg = submitError.response?.data?.error || '';
      if (submitError.response?.status === 403 || errMsg.includes('verify')) {
        setTempVerifyData({ email: email.trim().toLowerCase(), password });
        setOtpCode('');
        setOtpError('');
        setSuccessMessage('');
        try {
          await apiClient.post('/auth/send-otp', {
            email: email.trim().toLowerCase(),
            purpose: 'VERIFICATION',
          });
          setSuccessMessage('A verification code has been sent to your email.');
          setShowOtpVerify(true);
        } catch (sendErr) {
          setOtpError(sendErr.response?.data?.error || 'Failed to send OTP code.');
        }
      }
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setOtpError('');
    setSuccessMessage('');
    if (otpCode.length !== 6) {
      setOtpError('Please enter a 6-digit verification code.');
      return;
    }
    setVerifyLoading(true);
    try {
      await apiClient.post('/auth/verify-otp', {
        email: tempVerifyData.email,
        otp: otpCode,
        purpose: 'VERIFICATION',
      });
      setSuccessMessage('Email verified! Logging you in...');
      const user = await login(tempVerifyData.email, tempVerifyData.password);
      if (user.role === 'SUPER_ADMIN') navigate('/admin');
      else if (user.role === 'WHOLESALER') navigate('/wholesaler');
      else navigate('/store');
    } catch (err) {
      setOtpError(err.response?.data?.error || 'Verification failed.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError('');
    setSuccessMessage('');
    setResendLoading(true);
    try {
      await apiClient.post('/auth/send-otp', {
        email: tempVerifyData.email,
        purpose: 'VERIFICATION',
      });
      setSuccessMessage('Code resent successfully!');
    } catch (err) {
      setOtpError(err.response?.data?.error || 'Failed to resend.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-slate-50 to-orange-50/50 relative overflow-hidden text-[#1e293b] flex items-center justify-center p-4 sm:p-6 lg:p-10 selection:bg-[#4f46e5] selection:text-white">
      {/* Light Ambient Color Blobs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -right-20 w-96 h-96 bg-orange-400/15 rounded-full blur-3xl pointer-events-none" />

      {/* Centered Auth Card */}
      <div className="relative z-10 w-full max-w-[940px] rounded-3xl bg-white shadow-2xl shadow-indigo-950/10 border border-[#e2e8f0] overflow-hidden grid lg:grid-cols-[1fr_1.1fr]">
        <BrandPanel />

        {/* Right - Form Side */}
        <div className="p-8 lg:p-10 flex flex-col justify-center bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#1e293b]">Welcome back</h2>
              <p className="mt-0.5 text-xs font-medium text-[#64748b]">
                Sign in to access your NexCart account
              </p>
            </div>
            <Link
              to="/store"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-1.5 text-xs font-bold text-[#4f46e5] hover:bg-[#4f46e5] hover:text-white transition-all shadow-sm"
            >
              <Store className="h-3.5 w-3.5" />
              Store
            </Link>
          </div>

          {successMessage && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
              {successMessage}
            </div>
          )}

          {showOtpVerify ? (
            <LoginOtpVerify
              otpError={otpError}
              tempVerifyData={tempVerifyData}
              otpCode={otpCode}
              setOtpCode={setOtpCode}
              handleOtpSubmit={handleOtpSubmit}
              verifyLoading={verifyLoading}
              handleResendOtp={handleResendOtp}
              resendLoading={resendLoading}
              onBackToLogin={() => {
                setShowOtpVerify(false);
                setSuccessMessage('');
                setOtpError('');
              }}
            />
          ) : (
            <LoginFormSection
              error={error}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="bg-[#1e1b4b] p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-widest text-[#a5b4fc]">
          <Sparkles className="h-3 w-3 text-[#a5b4fc]" />
          NexCart Marketplace
        </div>

        <Link to="/store" className="inline-block group mt-4">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
            Nex<span className="text-[#a5b4fc]">Cart</span>
            <Store className="h-6 w-6 text-[#a5b4fc] group-hover:text-white transition-colors" />
          </h1>
        </Link>
        <p className="mt-3 text-xs text-[#c7d2fe] leading-relaxed max-w-xs">
          Your all-in-one marketplace for retail shopping and wholesale procurement.
        </p>
      </div>

      <div className="relative z-10 mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4f46e5] text-white mb-2.5">
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="text-xs font-bold text-white">AI Powered</p>
          <p className="text-[10px] text-[#c7d2fe] mt-0.5">Smart recommendations</p>
        </div>

        <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#818cf8] text-[#1e1b4b] mb-2.5">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <p className="text-xs font-bold text-white">Secure Access</p>
          <p className="text-[10px] text-[#c7d2fe] mt-0.5">JWT protected account</p>
        </div>

        <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f97316] text-white mb-2.5">
            <Truck className="h-4 w-4" />
          </div>
          <p className="text-xs font-bold text-white">Fast Shipping</p>
          <p className="text-[10px] text-[#c7d2fe] mt-0.5">Real-time order tracking</p>
        </div>

        <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#10b981] text-white mb-2.5">
            <CreditCard className="h-4 w-4" />
          </div>
          <p className="text-xs font-bold text-white">Easy Checkout</p>
          <p className="text-[10px] text-[#c7d2fe] mt-0.5">COD & Instant Pay</p>
        </div>
      </div>
    </div>
  );
}

function LoginOtpVerify({
  otpError,
  tempVerifyData,
  otpCode,
  setOtpCode,
  handleOtpSubmit,
  verifyLoading,
  handleResendOtp,
  resendLoading,
  onBackToLogin,
}) {
  return (
    <div>
      {otpError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
          {otpError}
        </div>
      )}
      <p className="text-xs text-[#64748b] mb-4">
        Enter the 6-digit code sent to{' '}
        <span className="font-bold text-[#1e293b]">{tempVerifyData?.email}</span>
      </p>
      <form onSubmit={handleOtpSubmit} className="space-y-4">
        <input
          type="text"
          required
          maxLength={6}
          aria-label="Verification Code"
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="w-full text-center tracking-[0.5em] font-mono rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3.5 text-2xl text-[#0f172a] outline-none focus:bg-white focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 transition-all"
        />
        <button
          type="submit"
          disabled={verifyLoading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#4f46e5]/20 disabled:opacity-50 transition-all"
        >
          {verifyLoading ? 'Verifying...' : 'Verify & Sign In'}
          {!verifyLoading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
      <div className="mt-5 flex justify-between text-xs">
        <button
          type="button"
          onClick={handleResendOtp}
          disabled={resendLoading}
          className="font-bold text-[#4f46e5] hover:text-[#4338ca] disabled:opacity-50 transition-colors"
        >
          {resendLoading ? 'Resending...' : 'Resend code'}
        </button>
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-[#64748b] hover:text-[#1e293b] transition-colors"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}

function LoginFormSection({
  error,
  email,
  setEmail,
  password,
  setPassword,
  handleSubmit,
  isLoading,
}) {
  return (
    <>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5"
          >
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            required
            aria-label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:bg-white focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 transition-all"
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label
              htmlFor="login-password"
              className="text-xs font-bold uppercase tracking-wider text-[#64748b]"
            >
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-bold text-[#4f46e5] hover:text-[#4338ca] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            required
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:bg-white focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#4f46e5]/20 disabled:opacity-50 transition-all mt-6"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
          {!isLoading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      <p className="mt-6 text-xs text-[#64748b] text-center">
        New to NexCart?{' '}
        <Link
          to="/register"
          className="font-bold text-[#4f46e5] hover:text-[#4338ca] transition-colors"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}

function FeatureStat({ title, value }) {
  return (
    <div className="rounded-[28px] border border-white/12 bg-white/6 px-5 py-5 backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b6ae9d]">{title}</p>
      <p className="mt-3 text-lg font-black tracking-tight">{value}</p>
    </div>
  );
}
