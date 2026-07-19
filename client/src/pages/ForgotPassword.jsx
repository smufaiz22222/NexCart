import { useState } from 'react';
import { ArrowRight, ShieldCheck, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios.js';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: request-otp, 2: verify-otp, 3: reset-password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        setResetToken(response.data.resetToken);
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
        resetToken,
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
    <div className="min-h-screen bg-[#f2f0ea] px-4 py-10 text-[#161412]">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl overflow-hidden rounded-[36px] border border-[#ddd7cc] bg-white shadow-[0_30px_90px_rgba(22,20,18,0.08)] lg:grid-cols-[1.08fr_0.92fr]">
        {/* Left Side Hero Panel */}
        <section className="relative overflow-hidden bg-[#161412] px-8 py-10 text-white sm:px-12 sm:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(227,190,120,0.18),_transparent_28%)]" />
          <div className="relative">
            <p className="text-sm font-black tracking-[0.24em]">NEXCART</p>
            <h1 className="mt-12 max-w-md text-5xl font-black leading-none tracking-tight sm:text-6xl">
              Reset your security settings.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-[#d8d1c5]">
              Follow the secure verification process to update your account password and restore
              access to your workspace.
            </p>

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              <FeatureStat title="Password protection" value="Advanced hashing" />
              <FeatureStat title="Verification" value="Secure OTP" />
              <FeatureStat title="Token validity" value="10-minute expiry" />
              <FeatureStat title="Platform security" value="Audit logged" />
            </div>
          </div>
        </section>

        {/* Right Side Form Panel */}
        <section className="flex items-center px-6 py-10 sm:px-10">
          <div className="mx-auto w-full max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ddd7cc] bg-[#f8f6f1] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-[#8f5d31]">
              <KeyRound className="h-4 w-4" />
              Secure password recovery
            </div>

            {step === 1 && (
              <>
                <h2 className="mt-6 text-4xl font-black tracking-tight text-[#161412]">
                  Forgot password?
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#6b665f]">
                  No worries. Enter your email below, and we will send you a 6-digit OTP code to
                  verify your identity and help you reset your password.
                </p>

                {error && (
                  <div className="mt-6 rounded-3xl border border-[#f0c6c0] bg-[#fff3f1] px-4 py-4 text-sm font-medium text-[#9d3b30]">
                    {error}
                  </div>
                )}

                <form className="mt-8 space-y-5" onSubmit={handleRequestOtp}>
                  <FormField label="Email address">
                    <input
                      type="email"
                      required
                      aria-label="Email address"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-[#ddd7cc] bg-[#fbfaf7] px-4 py-4 text-sm text-[#161412] outline-none transition focus:border-[#161412]"
                    />
                  </FormField>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#161412] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#2a2724] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? 'Sending OTP...' : 'Send OTP Code'}
                    {!isLoading && <ArrowRight className="h-4 w-4" />}
                  </button>
                </form>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="mt-6 text-4xl font-black tracking-tight text-[#161412]">
                  Verify identity
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#6b665f]">
                  Enter the 6-digit verification code sent to your email to verify your ownership of
                  the account.
                </p>

                {error && (
                  <div className="mt-6 rounded-3xl border border-[#f0c6c0] bg-[#fff3f1] px-4 py-4 text-sm font-medium text-[#9d3b30]">
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="mt-6 rounded-3xl border border-[#b8dec7] bg-[#eefaf1] px-4 py-4 text-sm font-medium text-[#22603a]">
                    {successMessage}
                  </div>
                )}

                <form className="mt-8 space-y-5" onSubmit={handleVerifyOtp}>
                  <div className="text-sm text-[#6b665f] leading-relaxed">
                    Enter the 6-digit verification code sent to <br />
                    <strong className="text-[#161412]">{email}</strong>
                  </div>

                  <FormField label="Verification Code">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      aria-label="Verification Code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full text-center tracking-[0.3em] font-mono rounded-2xl border border-[#ddd7cc] bg-[#fbfaf7] px-4 py-4 text-lg text-[#161412] outline-none transition focus:border-[#161412]"
                    />
                  </FormField>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#161412] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#2a2724] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? 'Verifying...' : 'Verify Code'}
                    {!isLoading && <ArrowRight className="h-4 w-4" />}
                  </button>
                </form>

                <div className="flex flex-col items-center gap-3 mt-6 text-sm font-semibold">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendLoading}
                    className="text-[#8f5d31] hover:underline disabled:opacity-50"
                  >
                    {resendLoading ? 'Resending...' : 'Resend verification code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setSuccessMessage('');
                      setError('');
                      setOtp('');
                    }}
                    className="text-[#8b857c] hover:text-[#161412] underline"
                  >
                    Change email address
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="mt-6 text-4xl font-black tracking-tight text-[#161412]">
                  Reset password
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#6b665f]">
                  Please enter a new, strong password below to complete the recovery process.
                </p>

                {error && (
                  <div className="mt-6 rounded-3xl border border-[#f0c6c0] bg-[#fff3f1] px-4 py-4 text-sm font-medium text-[#9d3b30]">
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="mt-6 rounded-3xl border border-[#b8dec7] bg-[#eefaf1] px-4 py-4 text-sm font-medium text-[#22603a]">
                    {successMessage}
                  </div>
                )}

                <form className="mt-8 space-y-5" onSubmit={handleResetPassword}>
                  <FormField label="New Password">
                    <div className="relative flex items-center">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        aria-label="New Password"
                        placeholder="Min. 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-2xl border border-[#ddd7cc] bg-[#fbfaf7] pl-4 pr-12 py-4 text-sm text-[#161412] outline-none transition focus:border-[#161412]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 text-[#8b857c] hover:text-[#161412]"
                        aria-label={showPassword ? 'Hide new password' : 'Show new password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </FormField>

                  <FormField label="Confirm New Password">
                    <div className="relative flex items-center">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        aria-label="Confirm New Password"
                        placeholder="Repeat new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-2xl border border-[#ddd7cc] bg-[#fbfaf7] pl-4 pr-12 py-4 text-sm text-[#161412] outline-none transition focus:border-[#161412]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 text-[#8b857c] hover:text-[#161412]"
                        aria-label={
                          showConfirmPassword
                            ? 'Hide confirm new password'
                            : 'Show confirm new password'
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </FormField>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#161412] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#2a2724] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? 'Resetting password...' : 'Update Password'}
                    {!isLoading && <ArrowRight className="h-4 w-4" />}
                  </button>
                </form>
              </>
            )}

            {/* Back to Sign In Link footer */}
            <p className="mt-8 text-sm text-[#6b665f]">
              Remembered your credentials?{' '}
              <Link to="/login" className="font-bold text-[#161412] underline underline-offset-4">
                Back to Sign In
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#8b857c]">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
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
