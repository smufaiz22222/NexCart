import { useState } from 'react';
import { ArrowRight, Check, ShoppingBag, Store } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import apiClient from '../api/axios.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordChecks = [
  { pattern: /.{8,}/, message: 'Use at least 8 characters.' },
  { pattern: /[A-Z]/, message: 'Include at least one uppercase letter.' },
  { pattern: /[a-z]/, message: 'Include at least one lowercase letter.' },
  { pattern: /\d/, message: 'Include at least one number.' },
  { pattern: /[^A-Za-z0-9]/, message: 'Include at least one special character.' },
];

function validateRegistrationForm(formData) {
  const name = formData.name.trim();
  const email = formData.email.trim().toLowerCase();
  if (!name) return 'Full name is required.';
  if (!email) return 'Email address is required.';
  if (!emailPattern.test(email)) return 'Enter a valid email address.';
  if (!formData.password) return 'Password is required.';
  const msg = passwordChecks.find(({ pattern }) => !pattern.test(formData.password))?.message;
  if (msg) return msg;
  if (!formData.confirmPassword) return 'Confirm your password.';
  if (formData.password !== formData.confirmPassword) return 'Passwords do not match.';
  if (formData.role === 'WHOLESALER') {
    if (!formData.businessName.trim()) return 'Business name is required.';
    if (!formData.businessPhone.trim()) return 'Business phone is required.';
    if (!formData.businessAddress.trim()) return 'Business address is required.';
  }
  return null;
}

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'CUSTOMER',
    businessName: '',
    businessPhone: '',
    taxId: '',
    businessAddress: '',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showOtpVerify, setShowOtpVerify] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [tempVerifyData, setTempVerifyData] = useState(null);
  const [otpError, setOtpError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const navigate = useNavigate();
  const { register, login, isLoading, error } = useAuthStore();

  const handleChange = (e) => {
    setFormData((c) => ({ ...c, [e.target.name]: e.target.value }));
    setSuccessMessage('');
    setValidationError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccessMessage('');
    setValidationError('');
    setOtpError('');
    const nextError = validateRegistrationForm(formData);
    if (nextError) {
      setValidationError(nextError);
      return;
    }
    try {
      await register(formData);
      setTempVerifyData({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });
      setOtpCode('');
      setOtpError('');
      setSuccessMessage('Verification code sent to your email.');
      setShowOtpVerify(true);
    } catch (submitError) {
      console.error(submitError);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setOtpError('');
    setSuccessMessage('');
    if (otpCode.length !== 6) {
      setOtpError('Enter a 6-digit code.');
      return;
    }
    setVerifyLoading(true);
    try {
      await apiClient.post('/auth/verify-otp', {
        email: tempVerifyData.email,
        otp: otpCode,
        purpose: 'VERIFICATION',
      });
      setSuccessMessage('Verified! Logging you in...');
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
      setSuccessMessage('Code resent!');
    } catch (err) {
      setOtpError(err.response?.data?.error || 'Failed to resend.');
    } finally {
      setResendLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3.5 text-sm text-[#0f172a] outline-none focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 transition-all placeholder:text-[#94a3b8]';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-[#eef2ff] via-[#f8fafc] to-[#f5f3ff]">
      {/* Single unified card */}
      <div className="w-full max-w-[920px] rounded-3xl bg-white shadow-2xl shadow-[#0f172a]/8 border border-[#e2e8f0] overflow-hidden grid lg:grid-cols-[0.9fr_1.1fr]">
        {/* Left - Brand Side */}
        <div className="bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />

          <div className="relative">
            <h1 className="text-3xl font-black tracking-tight">NexCart</h1>
            <p className="mt-3 text-sm text-indigo-100 leading-relaxed max-w-xs">
              Join as a buyer or seller. One platform, unlimited potential.
            </p>
          </div>

          {/* Role preview cards */}
          <div className="relative mt-8 space-y-3">
            <div
              className={`rounded-xl border p-4 transition-all duration-300 ${formData.role === 'CUSTOMER' ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/10'}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${formData.role === 'CUSTOMER' ? 'bg-white text-[#4f46e5]' : 'bg-white/10 text-white'}`}
                >
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">Customer</p>
                  <p className="text-[10px] text-indigo-200">Shop, track, save wishlists</p>
                </div>
                {formData.role === 'CUSTOMER' && <Check className="w-4 h-4 text-indigo-200" />}
              </div>
            </div>

            <div
              className={`rounded-xl border p-4 transition-all duration-300 ${formData.role === 'WHOLESALER' ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/10'}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${formData.role === 'WHOLESALER' ? 'bg-white text-[#7c3aed]' : 'bg-white/10 text-white'}`}
                >
                  <Store className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">Wholesaler</p>
                  <p className="text-[10px] text-indigo-200">List products, manage orders</p>
                </div>
                {formData.role === 'WHOLESALER' && <Check className="w-4 h-4 text-indigo-200" />}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="relative mt-8 pt-6 border-t border-white/15 flex gap-6">
            <div>
              <p className="text-xl font-black">10K+</p>
              <p className="text-[9px] text-indigo-200 uppercase tracking-wider font-semibold">
                Products
              </p>
            </div>
            <div>
              <p className="text-xl font-black">500+</p>
              <p className="text-[9px] text-indigo-200 uppercase tracking-wider font-semibold">
                Sellers
              </p>
            </div>
            <div>
              <p className="text-xl font-black">50K+</p>
              <p className="text-[9px] text-indigo-200 uppercase tracking-wider font-semibold">
                Orders
              </p>
            </div>
          </div>
        </div>

        {/* Right - Form Side */}
        <div className="p-10 flex flex-col justify-center overflow-y-auto max-h-[90vh]">
          <h2 className="text-2xl font-black tracking-tight text-[#0f172a]">Create account</h2>
          <p className="mt-1 text-sm text-[#64748b]">Get started in under a minute</p>

          {validationError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
              {validationError}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}
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
                Code sent to{' '}
                <span className="font-bold text-[#0f172a]">{tempVerifyData?.email}</span>
              </p>
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.5em] font-mono rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-4 text-2xl text-[#0f172a] outline-none focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10"
                />
                <button
                  type="submit"
                  disabled={verifyLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#4338ca] disabled:opacity-50"
                >
                  {verifyLoading ? 'Verifying...' : 'Verify & Continue'}
                  {!verifyLoading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
              <div className="mt-4 flex justify-between text-xs">
                <button
                  onClick={handleResendOtp}
                  disabled={resendLoading}
                  className="font-semibold text-[#4f46e5] disabled:opacity-50"
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
                  Back
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Role Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#f1f5f9] rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormData((c) => ({ ...c, role: 'CUSTOMER' }))}
                  className={`py-2.5 rounded-lg text-xs font-bold transition-all ${formData.role === 'CUSTOMER' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b]'}`}
                >
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((c) => ({ ...c, role: 'WHOLESALER' }))}
                  className={`py-2.5 rounded-lg text-xs font-bold transition-all ${formData.role === 'WHOLESALER' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b]'}`}
                >
                  Wholesaler
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 8 chars"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                    Confirm
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Password strength */}
              <div className="flex gap-1">
                {passwordChecks.map((check, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all ${check.pattern.test(formData.password) ? 'bg-[#4f46e5]' : 'bg-[#e2e8f0]'}`}
                  />
                ))}
              </div>

              {/* Wholesaler fields */}
              {formData.role === 'WHOLESALER' && (
                <div className="space-y-3 rounded-xl border border-[#ddd6fe] bg-[#faf5ff] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#7c3aed]">
                    Business Details
                  </p>
                  <input
                    type="text"
                    name="businessName"
                    required
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder="Business / Shop Name"
                    className={inputClass}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      name="businessPhone"
                      required
                      value={formData.businessPhone}
                      onChange={handleChange}
                      placeholder="Phone"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      name="taxId"
                      value={formData.taxId}
                      onChange={handleChange}
                      placeholder="GST (optional)"
                      className={inputClass}
                    />
                  </div>
                  <textarea
                    name="businessAddress"
                    required
                    rows={2}
                    value={formData.businessAddress}
                    onChange={handleChange}
                    placeholder="Business address"
                    className={inputClass + ' resize-none'}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#4338ca] disabled:opacity-50 transition-all"
              >
                {isLoading
                  ? 'Creating...'
                  : formData.role === 'WHOLESALER'
                    ? 'Submit Application'
                    : 'Create Account'}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          )}

          <p className="mt-6 text-sm text-[#64748b] text-center">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#4f46e5] hover:text-[#4338ca]">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
