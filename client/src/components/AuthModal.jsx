import { useState, useTransition } from 'react';
import { X, ArrowRight, ShoppingBag, BriefcaseBusiness, Eye, EyeOff } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';

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
  const { login, register } = useAuthStore();
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Login form state
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  // Register form state
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'CUSTOMER',
    businessName: '',
  });

  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!loginData.email.trim() || !loginData.password) {
      setFormError('Please fill in all fields.');
      return;
    }

    startTransition(async () => {
      try {
        await login(loginData.email.trim().toLowerCase(), loginData.password);
        toast.success('Successfully logged in!');
        onClose();
        if (onSuccess) onSuccess();
      } catch (err) {
        setFormError(err.response?.data?.error || 'Invalid email or password.');
      }
    });
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    const nextError = validateRegistrationForm(registerData);
    if (nextError) {
      setFormError(nextError);
      return;
    }

    startTransition(async () => {
      try {
        await register(registerData);
        toast.success('Account created! Logging you in...');

        // Auto login
        await login(registerData.email.trim().toLowerCase(), registerData.password);
        toast.success('Logged in successfully!');
        onClose();
        if (onSuccess) onSuccess();
      } catch (err) {
        setFormError(err.response?.data?.error || 'Registration failed.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-lg overflow-y-auto max-h-[90vh] rounded-[32px] border border-[#ddd7cc] bg-white p-8 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full p-2 text-[#8b857c] hover:bg-[#f2f0ea] hover:text-[#161412] transition"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo and Tabs Header */}
        <div className="text-center mt-2">
          <span className="text-xl font-black tracking-tight text-[#161412]">NEXCART</span>
          <p className="mt-2 text-sm text-[#6b665f]">
            Access the wholesale-to-consumer marketplace
          </p>

          <div className="mt-6 flex border-b border-[#ece7de]">
            <button
              onClick={() => {
                setActiveTab('login');
                setFormError('');
              }}
              className={`flex-1 pb-3 text-sm font-bold transition-all border-b-2 ${
                activeTab === 'login'
                  ? 'border-[#161412] text-[#161412]'
                  : 'border-transparent text-[#8b857c] hover:text-[#161412]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab('register');
                setFormError('');
              }}
              className={`flex-1 pb-3 text-sm font-bold transition-all border-b-2 ${
                activeTab === 'register'
                  ? 'border-[#161412] text-[#161412]'
                  : 'border-transparent text-[#8b857c] hover:text-[#161412]'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {formError && (
          <div className="mt-5 rounded-2xl border border-[#f0c6c0] bg-[#fff3f1] px-4 py-3 text-xs font-semibold text-[#9d3b30] animate-shake">
            {formError}
          </div>
        )}

        {/* Content Body */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
            <FormField label="Email Address">
              <input
                type="email"
                required
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-[#ddd7cc] bg-[#fbfaf7] px-4 py-3 text-sm text-[#161412] outline-none transition focus:border-[#161412]"
              />
            </FormField>

            <FormField label="Password">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  placeholder="Enter your password"
                  className="w-full rounded-2xl border border-[#ddd7cc] bg-[#fbfaf7] px-4 py-3 pr-10 text-sm text-[#161412] outline-none transition focus:border-[#161412]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8b857c] hover:text-[#161412]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>

            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#161412] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#2a2724] disabled:cursor-not-allowed disabled:opacity-60 mt-6"
            >
              {isPending ? 'Signing in...' : 'Sign In'}
              {!isPending && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
            {/* Role Selection Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRegisterData({ ...registerData, role: 'CUSTOMER' })}
                className={`flex flex-col rounded-2xl border p-3 text-left transition ${
                  registerData.role === 'CUSTOMER'
                    ? 'border-[#161412] bg-[#161412] text-white'
                    : 'border-[#ddd7cc] bg-[#fbfaf7] text-[#161412]'
                }`}
              >
                <span className="text-xs font-black tracking-tight">Buy Products</span>
                <span
                  className={`text-[10px] mt-0.5 ${registerData.role === 'CUSTOMER' ? 'text-[#d8d1c5]' : 'text-[#6b665f]'}`}
                >
                  Customer
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRegisterData({ ...registerData, role: 'WHOLESALER' })}
                className={`flex flex-col rounded-2xl border p-3 text-left transition ${
                  registerData.role === 'WHOLESALER'
                    ? 'border-[#161412] bg-[#161412] text-white'
                    : 'border-[#ddd7cc] bg-[#fbfaf7] text-[#161412]'
                }`}
              >
                <span className="text-xs font-black tracking-tight">Sell Products</span>
                <span
                  className={`text-[10px] mt-0.5 ${registerData.role === 'WHOLESALER' ? 'text-[#d8d1c5]' : 'text-[#6b665f]'}`}
                >
                  Wholesaler
                </span>
              </button>
            </div>

            <FormField label="Full Name">
              <input
                type="text"
                required
                value={registerData.name}
                onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                placeholder="John Doe"
                className="w-full rounded-2xl border border-[#ddd7cc] bg-[#fbfaf7] px-4 py-3 text-sm text-[#161412] outline-none transition focus:border-[#161412]"
              />
            </FormField>

            <FormField label="Email Address">
              <input
                type="email"
                required
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-[#ddd7cc] bg-[#fbfaf7] px-4 py-3 text-sm text-[#161412] outline-none transition focus:border-[#161412]"
              />
            </FormField>

            <FormField label="Password">
              <input
                type="password"
                required
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                placeholder="Create password"
                className="w-full rounded-2xl border border-[#ddd7cc] bg-[#fbfaf7] px-4 py-3 text-sm text-[#161412] outline-none transition focus:border-[#161412]"
              />
            </FormField>

            <FormField label="Confirm Password">
              <input
                type="password"
                required
                value={registerData.confirmPassword}
                onChange={(e) =>
                  setRegisterData({ ...registerData, confirmPassword: e.target.value })
                }
                placeholder="Confirm password"
                className="w-full rounded-2xl border border-[#ddd7cc] bg-[#fbfaf7] px-4 py-3 text-sm text-[#161412] outline-none transition focus:border-[#161412]"
              />
            </FormField>

            {registerData.role === 'WHOLESALER' && (
              <FormField label="Business / Shop Name">
                <input
                  type="text"
                  required
                  value={registerData.businessName}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, businessName: e.target.value })
                  }
                  placeholder="Brand / Wholesaler Name"
                  className="w-full rounded-2xl border border-[#d2b08a] bg-[#fff8ee] px-4 py-3 text-sm text-[#161412] outline-none transition focus:border-[#8f5d31]"
                />
              </FormField>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#161412] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#2a2724] disabled:cursor-not-allowed disabled:opacity-60 mt-6"
            >
              {isPending ? 'Registering...' : 'Create Account'}
              {!isPending && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8b857c]">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
