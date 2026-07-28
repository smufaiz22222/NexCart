import { useState, useTransition } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Truck,
  CreditCard,
  Store,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';
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
  const businessName = formData.businessName.trim();

  if (!name) return 'Full name is required.';
  if (!email) return 'Email address is required.';
  if (!emailPattern.test(email)) return 'Enter a valid email address.';
  if (!formData.password) return 'Password is required.';

  const passwordMessage = passwordChecks.find(
    ({ pattern }) => !pattern.test(formData.password)
  )?.message;
  if (passwordMessage) return passwordMessage;

  if (formData.password !== formData.confirmPassword) {
    return 'Passwords do not match.';
  }

  if (formData.role === 'WHOLESALER' && !businessName) {
    return 'Business / Shop Name is required for wholesalers.';
  }

  return null;
}

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const { login, register, clearError } = useAuthStore();
  const [activeTab, setActiveTab] = useState('login'); // 'login', 'register', or 'verify-otp'
  const [isPending, startTransition] = useTransition();

  // OTP Verification state
  const [tempVerifyData, setTempVerifyData] = useState(null); // { email, password }
  const [formError, setFormError] = useState('');

  const handleClose = () => {
    clearError();
    onClose();
  };

  if (!isOpen) return null;

  const handleLoginSubmit = (email, password) => {
    setFormError('');

    if (!email.trim() || !password) {
      setFormError('Please fill in all fields.');
      return;
    }

    startTransition(async () => {
      try {
        await login(email.trim().toLowerCase(), password);
        toast.success('Successfully logged in!');
        onClose();
        if (onSuccess) onSuccess();
      } catch (err) {
        const errMsg = err.response?.data?.error || 'Invalid email or password.';
        if (err.response?.status === 403 || errMsg.includes('verify')) {
          setFormError(
            <span>
              {errMsg}{' '}
              <button
                type="button"
                onClick={async () => {
                  setFormError('');
                  const emailClean = email.trim().toLowerCase();
                  setTempVerifyData({ email: emailClean, password });
                  try {
                    await apiClient.post('/auth/send-otp', {
                      email: emailClean,
                      purpose: 'VERIFICATION',
                    });
                    toast.success('Verification code sent to your email!');
                    setActiveTab('verify-otp');
                  } catch (sendErr) {
                    setFormError(sendErr.response?.data?.error || 'Failed to send OTP code.');
                  }
                }}
                className="underline hover:text-[#4f46e5] font-bold"
              >
                Verify Now
              </button>
            </span>
          );
        } else {
          setFormError(errMsg);
        }
      }
    });
  };

  const handleRegisterSubmit = (registerData) => {
    setFormError('');

    const nextError = validateRegistrationForm(registerData);
    if (nextError) {
      setFormError(nextError);
      return;
    }

    startTransition(async () => {
      try {
        await register(registerData);
        toast.success('Verification code sent! Please verify your email to complete registration.');
        setTempVerifyData({
          email: registerData.email.trim().toLowerCase(),
          password: registerData.password,
        });
        setActiveTab('verify-otp');
      } catch (err) {
        setFormError(err.response?.data?.error || 'Registration failed.');
      }
    });
  };

  const handleOtpSubmit = (otpCode) => {
    setFormError('');

    if (otpCode.length !== 6) {
      setFormError('Please enter a 6-digit verification code.');
      return;
    }

    startTransition(async () => {
      try {
        await apiClient.post('/auth/verify-otp', {
          email: tempVerifyData.email,
          otp: otpCode,
          purpose: 'VERIFICATION',
        });
        toast.success('Email verified successfully!');

        // Auto login if we have password
        if (tempVerifyData.password) {
          await login(tempVerifyData.email, tempVerifyData.password);
          toast.success('Successfully logged in!');
          onClose();
          if (onSuccess) onSuccess();
        } else {
          setActiveTab('login');
          toast.info('Please enter your password to log in.');
        }
      } catch (err) {
        setFormError(err.response?.data?.error || 'Verification failed. Please try again.');
      }
    });
  };

  const handleResendOtp = () => {
    setFormError('');
    startTransition(async () => {
      try {
        await apiClient.post('/auth/send-otp', {
          email: tempVerifyData.email,
          purpose: 'VERIFICATION',
        });
        toast.success('Verification code resent successfully!');
      } catch (err) {
        setFormError(err.response?.data?.error || 'Failed to resend verification code.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md overflow-y-auto max-h-[90vh] rounded-3xl border border-[#e2e8f0] bg-white p-8 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-5 top-5 rounded-full p-2 text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo and Tabs Header */}
        <div className="text-center mt-1">
          <div className="inline-flex items-center justify-center gap-1.5 font-black text-2xl tracking-tight text-[#1e293b]">
            Nex<span className="text-[#4f46e5]">Cart</span>
          </div>
          <p className="mt-1 text-xs text-[#64748b]">
            Access the wholesale-to-consumer marketplace
          </p>

          {activeTab !== 'verify-otp' && (
            <div className="mt-6 grid grid-cols-2 gap-1.5 p-1.5 bg-[#f8fafc] rounded-2xl border border-[#cbd5e1]">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setFormError('');
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'login'
                    ? 'bg-[#4f46e5] text-white shadow-md shadow-[#4f46e5]/20'
                    : 'text-[#64748b] hover:text-[#1e293b]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setFormError('');
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'register'
                    ? 'bg-[#4f46e5] text-white shadow-md shadow-[#4f46e5]/20'
                    : 'text-[#64748b] hover:text-[#1e293b]'
                }`}
              >
                Create Account
              </button>
            </div>
          )}
        </div>

        {/* Error Banner */}
        {formError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600 animate-shake">
            {formError}
          </div>
        )}

        {/* Content Body */}
        {activeTab === 'verify-otp' ? (
          <VerifyOtpForm
            onSubmit={handleOtpSubmit}
            onResendOtp={handleResendOtp}
            onBackToSignIn={() => {
              setActiveTab('login');
              setFormError('');
            }}
            isPending={isPending}
            tempVerifyEmail={tempVerifyData?.email}
          />
        ) : activeTab === 'login' ? (
          <LoginForm
            key={tempVerifyData?.email || 'login'}
            onSubmit={handleLoginSubmit}
            isPending={isPending}
            initialEmail={tempVerifyData?.email || ''}
            onClose={handleClose}
          />
        ) : (
          <RegisterForm onSubmit={handleRegisterSubmit} isPending={isPending} />
        )}
      </div>
    </div>
  );
}

function FormField({ label, children, htmlFor }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5"
      >
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function LoginForm({ onSubmit, isPending, initialEmail, onClose }) {
  const [loginData, setLoginData] = useState({
    email: initialEmail,
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(loginData.email, loginData.password);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      <FormField label="Email Address" htmlFor="modal-login-email">
        <input
          id="modal-login-email"
          type="email"
          required
          aria-label="Email Address"
          value={loginData.email}
          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm text-[#0f172a] outline-none focus:bg-white focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 transition-all placeholder:text-[#94a3b8]"
        />
      </FormField>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="modal-login-password"
            className="block text-xs font-bold uppercase tracking-wider text-[#64748b]"
          >
            Password
          </label>
          <Link
            to="/forgot-password"
            onClick={onClose}
            className="text-xs font-bold text-[#4f46e5] hover:text-[#4338ca] transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            id="modal-login-password"
            type={showPassword ? 'text' : 'password'}
            required
            aria-label="Password"
            value={loginData.password}
            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
            placeholder="Enter your password"
            className="w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] pl-4 pr-10 py-3 text-sm text-[#0f172a] outline-none focus:bg-white focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 transition-all placeholder:text-[#94a3b8]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a] transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#4f46e5]/20 disabled:opacity-50 transition-all mt-6"
      >
        {isPending ? 'Signing in...' : 'Sign In'}
        {!isPending && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}

function RegisterForm({ onSubmit, isPending }) {
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'CUSTOMER',
    businessName: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(registerData);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      {/* Role Selection Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setRegisterData({ ...registerData, role: 'CUSTOMER' })}
          className={`flex flex-col rounded-xl border p-3 text-left transition-all ${
            registerData.role === 'CUSTOMER'
              ? 'border-[#4f46e5] bg-[#4f46e5] text-white shadow-md shadow-[#4f46e5]/20'
              : 'border-[#e2e8f0] bg-[#f8fafc] text-[#0f172a] hover:border-[#cbd5e1]'
          }`}
        >
          <span className="text-xs font-black tracking-tight">Buy Products</span>
          <span
            className={`text-[10px] mt-0.5 ${registerData.role === 'CUSTOMER' ? 'text-white/80' : 'text-[#64748b]'}`}
          >
            Customer
          </span>
        </button>
        <button
          type="button"
          onClick={() => setRegisterData({ ...registerData, role: 'WHOLESALER' })}
          className={`flex flex-col rounded-xl border p-3 text-left transition-all ${
            registerData.role === 'WHOLESALER'
              ? 'border-[#1e1b4b] bg-[#1e1b4b] text-white shadow-md shadow-[#1e1b4b]/20'
              : 'border-[#e2e8f0] bg-[#f8fafc] text-[#0f172a] hover:border-[#cbd5e1]'
          }`}
        >
          <span className="text-xs font-black tracking-tight">Sell Products</span>
          <span
            className={`text-[10px] mt-0.5 ${registerData.role === 'WHOLESALER' ? 'text-white/80' : 'text-[#64748b]'}`}
          >
            Wholesaler
          </span>
        </button>
      </div>

      <FormField label="Full Name" htmlFor="modal-register-name">
        <input
          id="modal-register-name"
          type="text"
          required
          aria-label="Full Name"
          value={registerData.name}
          onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
          placeholder="John Doe"
          className="w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm text-[#0f172a] outline-none focus:bg-white focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 transition-all placeholder:text-[#94a3b8]"
        />
      </FormField>

      <FormField label="Email Address" htmlFor="modal-register-email">
        <input
          id="modal-register-email"
          type="email"
          required
          aria-label="Email Address"
          value={registerData.email}
          onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm text-[#0f172a] outline-none focus:bg-white focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 transition-all placeholder:text-[#94a3b8]"
        />
      </FormField>

      <FormField label="Password" htmlFor="modal-register-password">
        <input
          id="modal-register-password"
          type="password"
          required
          aria-label="Password"
          value={registerData.password}
          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
          placeholder="Create password"
          className="w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm text-[#0f172a] outline-none focus:bg-white focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 transition-all placeholder:text-[#94a3b8]"
        />
      </FormField>

      <FormField label="Confirm Password" htmlFor="modal-register-confirmPassword">
        <input
          id="modal-register-confirmPassword"
          type="password"
          required
          aria-label="Confirm Password"
          value={registerData.confirmPassword}
          onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
          placeholder="Confirm password"
          className="w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm text-[#0f172a] outline-none focus:bg-white focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 transition-all placeholder:text-[#94a3b8]"
        />
      </FormField>

      {registerData.role === 'WHOLESALER' && (
        <FormField label="Business / Shop Name" htmlFor="modal-register-businessName">
          <input
            id="modal-register-businessName"
            type="text"
            required
            aria-label="Business / Shop Name"
            value={registerData.businessName}
            onChange={(e) => setRegisterData({ ...registerData, businessName: e.target.value })}
            placeholder="Brand / Wholesaler Name"
            className="w-full rounded-xl border border-indigo-100 bg-[#eef2ff]/70 px-4 py-3 text-sm text-[#0f172a] outline-none focus:bg-white focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 transition-all placeholder:text-[#94a3b8]"
          />
        </FormField>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#4f46e5]/20 disabled:opacity-50 transition-all mt-6"
      >
        {isPending ? 'Registering...' : 'Create Account'}
        {!isPending && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}

function VerifyOtpForm({ onSubmit, onResendOtp, onBackToSignIn, isPending, tempVerifyEmail }) {
  const [otpCode, setOtpCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(otpCode);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      <div className="text-xs text-[#64748b] text-center mb-4 leading-relaxed">
        We sent a 6-digit verification code to <br />
        <strong className="text-[#1e293b]">{tempVerifyEmail}</strong>
      </div>

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
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#4f46e5]/20 disabled:opacity-50 transition-all mt-6"
      >
        {isPending ? 'Verifying...' : 'Verify & Sign In'}
        {!isPending && <ArrowRight className="h-4 w-4" />}
      </button>

      <div className="flex justify-between items-center mt-5 text-xs">
        <button
          type="button"
          onClick={onResendOtp}
          disabled={isPending}
          className="font-bold text-[#4f46e5] hover:text-[#4338ca] disabled:opacity-50 transition-colors"
        >
          Resend code
        </button>
        <button
          type="button"
          onClick={onBackToSignIn}
          className="text-[#64748b] hover:text-[#1e293b] transition-colors"
        >
          Back to Sign In
        </button>
      </div>
    </form>
  );
}
