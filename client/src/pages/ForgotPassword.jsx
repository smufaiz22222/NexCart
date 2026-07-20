import { useState, useRef } from 'react';
import { Sparkles, ShieldCheck, Truck, CreditCard, Store } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios.js';
import {
  RequestOtpStep,
  VerifyOtpStep,
  ResetPasswordStep,
} from '../components/auth/ForgotPasswordSteps';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: request-otp, 2: verify-otp, 3: reset-password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const resetTokenRef = useRef('');

  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      await apiClient.post('/auth/forgot-password-send-otp', {
        email: email.trim().toLowerCase(),
      });
      setSuccessMessage('A 6-digit verification code has been sent to your email.');
      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.error || 'Failed to send verification code. Please check the email.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (otp.length !== 6) {
      setError('Please enter a 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/forgot-password-verify-otp', {
        email: email.trim().toLowerCase(),
        otp,
      });

      if (response.data?.resetToken) {
        resetTokenRef.current = response.data.resetToken;
        setSuccessMessage('Email verified successfully! Please enter your new password.');
        setStep(3);
      } else {
        setError('Verification succeeded, but no reset token was returned.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccessMessage('');
    setResendLoading(true);
    try {
      await apiClient.post('/auth/forgot-password-send-otp', {
        email: email.trim().toLowerCase(),
      });
      setSuccessMessage('Verification code resent successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend verification code.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        resetToken: resetTokenRef.current,
        newPassword,
      });

      setSuccessMessage('Password reset successful! Redirecting you to login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please request a new OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-slate-50 to-orange-50/50 relative overflow-hidden text-[#1e293b] flex items-center justify-center p-4 sm:p-6 lg:p-10 selection:bg-[#4f46e5] selection:text-white">
      {/* Light Ambient Color Blobs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -right-20 w-96 h-96 bg-orange-400/15 rounded-full blur-3xl pointer-events-none" />

      {/* Centered Auth Card */}
      <div className="relative z-10 w-full max-w-[940px] rounded-3xl bg-white shadow-2xl shadow-indigo-950/10 border border-[#e2e8f0] overflow-hidden grid lg:grid-cols-[1fr_1.1fr]">
        {/* Left - Storefront Brand Panel */}
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

        {/* Right - Form Side */}
        <div className="p-8 lg:p-10 flex flex-col justify-center bg-white relative">
          <div className="absolute top-6 right-6">
            <Link
              to="/store"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-1.5 text-xs font-bold text-[#4f46e5] hover:bg-[#4f46e5] hover:text-white transition-all shadow-sm"
            >
              <Store className="h-3.5 w-3.5" />
              Store
            </Link>
          </div>

          {step === 1 && (
            <RequestOtpStep
              email={email}
              setEmail={setEmail}
              error={error}
              isLoading={isLoading}
              handleRequestOtp={handleRequestOtp}
            />
          )}

          {step === 2 && (
            <VerifyOtpStep
              email={email}
              otp={otp}
              setOtp={setOtp}
              error={error}
              successMessage={successMessage}
              isLoading={isLoading}
              resendLoading={resendLoading}
              handleVerifyOtp={handleVerifyOtp}
              handleResendOtp={handleResendOtp}
              setStep={setStep}
              setSuccessMessage={setSuccessMessage}
              setError={setError}
            />
          )}

          {step === 3 && (
            <ResetPasswordStep
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              error={error}
              successMessage={successMessage}
              isLoading={isLoading}
              handleResetPassword={handleResetPassword}
            />
          )}

          {/* Back to Sign In Link footer */}
          <p className="mt-6 text-xs text-[#64748b] text-center">
            Remembered your credentials?{' '}
            <Link
              to="/login"
              className="font-bold text-[#4f46e5] hover:text-[#4338ca] transition-colors"
            >
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
