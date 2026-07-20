import { useState } from 'react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

function FormField({ htmlFor, label, children }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function PasswordInputField({ id, label, value, onChange, placeholder, ariaLabel }) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <FormField htmlFor={id} label={label}>
      <div className="relative flex items-center">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          required
          aria-label={ariaLabel}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] pl-4 pr-12 py-3.5 text-sm text-[#0f172a] outline-none focus:bg-white focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 transition-all placeholder:text-[#94a3b8]"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 text-[#94a3b8] hover:text-[#0f172a] transition-colors"
          aria-label={showPassword ? `Hide ${ariaLabel}` : `Show ${ariaLabel}`}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </FormField>
  );
}

export function RequestOtpStep({ email, setEmail, error, isLoading, handleRequestOtp }) {
  return (
    <>
      <h2 className="text-2xl font-black tracking-tight text-[#1e293b]">Forgot password?</h2>
      <p className="mt-1 text-xs text-[#64748b]">
        No worries. Enter your email below to receive a 6-digit OTP code to verify your identity.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
          {error}
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={handleRequestOtp}>
        <FormField htmlFor="forgot-email" label="Email address">
          <input
            id="forgot-email"
            type="email"
            required
            aria-label="Email address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3.5 text-sm text-[#0f172a] outline-none focus:bg-white focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 transition-all placeholder:text-[#94a3b8]"
          />
        </FormField>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#4f46e5]/20 disabled:opacity-50 transition-all mt-6"
        >
          {isLoading ? 'Sending OTP...' : 'Send OTP Code'}
          {!isLoading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
    </>
  );
}

export function VerifyOtpStep({
  email,
  otp,
  setOtp,
  error,
  successMessage,
  isLoading,
  resendLoading,
  handleVerifyOtp,
  handleResendOtp,
  setStep,
  setSuccessMessage,
  setError,
}) {
  return (
    <>
      <h2 className="text-2xl font-black tracking-tight text-[#1e293b]">Verify identity</h2>
      <p className="mt-1 text-xs text-[#64748b]">
        Enter the 6-digit code sent to <span className="font-bold text-[#1e293b]">{email}</span>
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
          {successMessage}
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={handleVerifyOtp}>
        <input
          type="text"
          required
          maxLength={6}
          aria-label="Verification Code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="w-full text-center tracking-[0.5em] font-mono rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3.5 text-2xl text-[#0f172a] outline-none focus:bg-white focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 transition-all"
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#4f46e5]/20 disabled:opacity-50 transition-all mt-6"
        >
          {isLoading ? 'Verifying...' : 'Verify Code'}
          {!isLoading && <ArrowRight className="h-4 w-4" />}
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
          onClick={() => {
            setStep(1);
            setSuccessMessage('');
            setError('');
            setOtp('');
          }}
          className="text-[#64748b] hover:text-[#1e293b] transition-colors"
        >
          Change email
        </button>
      </div>
    </>
  );
}

export function ResetPasswordStep({
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  error,
  successMessage,
  isLoading,
  handleResetPassword,
}) {
  return (
    <>
      <h2 className="text-2xl font-black tracking-tight text-[#1e293b]">Set new password</h2>
      <p className="mt-1 text-xs text-[#64748b]">
        Please enter your new password below to complete password recovery.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
          {successMessage}
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={handleResetPassword}>
        <PasswordInputField
          id="new-password"
          label="New Password"
          ariaLabel="New Password"
          placeholder="Min. 8 characters"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <PasswordInputField
          id="confirm-password"
          label="Confirm New Password"
          ariaLabel="Confirm New Password"
          placeholder="Repeat new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#4f46e5]/20 disabled:opacity-50 transition-all mt-6"
        >
          {isLoading ? 'Resetting password...' : 'Update Password'}
          {!isLoading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
    </>
  );
}
