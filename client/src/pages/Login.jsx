import { useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck, Sparkles, Truck, CreditCard } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-[#f1f5f9] via-[#f8fafc] to-[#eef2ff]">
      {/* Single unified card */}
      <div className="w-full max-w-[900px] rounded-3xl bg-white shadow-2xl shadow-[#0f172a]/8 border border-[#e2e8f0] overflow-hidden grid lg:grid-cols-[1fr_1.1fr]">
        {/* Left - Brand Side */}
        <div className="bg-gradient-to-br from-[#4f46e5] to-[#6366f1] p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <h1 className="text-3xl font-black tracking-tight">NexCart</h1>
            <p className="mt-4 text-sm text-indigo-100 leading-relaxed max-w-xs">
              Your all-in-one marketplace for retail shopping and wholesale procurement.
            </p>
          </div>

          <div className="relative mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-4">
              <Sparkles className="h-4 w-4 text-indigo-200 mb-2" />
              <p className="text-sm font-bold">AI Powered</p>
              <p className="text-[10px] text-indigo-200 mt-0.5">Smart recommendations</p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-4">
              <ShieldCheck className="h-4 w-4 text-indigo-200 mb-2" />
              <p className="text-sm font-bold">Secure</p>
              <p className="text-[10px] text-indigo-200 mt-0.5">JWT protected access</p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-4">
              <Truck className="h-4 w-4 text-indigo-200 mb-2" />
              <p className="text-sm font-bold">Fast Delivery</p>
              <p className="text-[10px] text-indigo-200 mt-0.5">Real-time tracking</p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-4">
              <CreditCard className="h-4 w-4 text-indigo-200 mb-2" />
              <p className="text-sm font-bold">Easy Pay</p>
              <p className="text-[10px] text-indigo-200 mt-0.5">COD + Razorpay</p>
            </div>
          </div>
        </div>

        {/* Right - Form Side */}
        <div className="p-10 flex flex-col justify-center">
          <h2 className="text-2xl font-black tracking-tight text-[#0f172a]">Welcome back</h2>
          <p className="mt-1 text-sm text-[#64748b]">Sign in to your account</p>

          {successMessage && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
              {successMessage}
            </div>
          )}

          {showOtpVerify ? (
            <div className="mt-5">
              {otpError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
                  {otpError}
                </div>
              )}
              <p className="text-sm text-[#64748b] mb-4">
                Enter the 6-digit code sent to{' '}
                <span className="font-bold text-[#0f172a]">{tempVerifyData?.email}</span>
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
                  className="w-full text-center tracking-[0.5em] font-mono rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-4 text-2xl text-[#0f172a] outline-none focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 transition-all"
                />
                <button
                  type="submit"
                  disabled={verifyLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#4338ca] disabled:opacity-50 transition-all"
                >
                  {verifyLoading ? 'Verifying...' : 'Verify & Sign In'}
                  {!verifyLoading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
              <div className="mt-5 flex justify-between text-xs">
                <button
                  onClick={handleResendOtp}
                  disabled={resendLoading}
                  className="font-semibold text-[#4f46e5] hover:text-[#4338ca] disabled:opacity-50"
                >
                  {resendLoading ? 'Resending...' : 'Resend code'}
                </button>
                <button
                  onClick={() => {
                    setShowOtpVerify(false);
                    setSuccessMessage('');
                    setOtpError('');
                  }}
                  className="text-[#64748b] hover:text-[#0f172a]"
                >
                  Back to login
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    aria-label="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3.5 text-sm text-[#0f172a] outline-none focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 transition-all placeholder:text-[#94a3b8]"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-[#374151]">Password</label>
                    <Link
                      to="/forgot-password"
                      className="text-[11px] font-semibold text-[#4f46e5] hover:text-[#4338ca]"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    type="password"
                    required
                    aria-label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3.5 text-sm text-[#0f172a] outline-none focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 transition-all placeholder:text-[#94a3b8]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#4338ca] disabled:opacity-50 transition-all"
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                  {!isLoading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <p className="mt-6 text-sm text-[#64748b] text-center">
                New to NexCart?{' '}
                <Link to="/register" className="font-bold text-[#4f46e5] hover:text-[#4338ca]">
                  Create an account
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
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
