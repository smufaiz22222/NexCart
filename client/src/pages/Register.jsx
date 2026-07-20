import { useState, useEffect, useReducer } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store } from 'lucide-react';
import useAuthStore from '../store/authStore';
import apiClient from '../api/axios.js';
import {
  RegisterHeroBanner,
  RegisterOtpStep,
  RegisterFormFields,
} from '../components/auth/RegisterComponents';
import {
  validateRegistrationForm,
  initialOtpState,
  otpReducer,
} from '../components/auth/registerValidation';

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
  const [otpState, dispatchOtp] = useReducer(otpReducer, initialOtpState);

  const navigate = useNavigate();
  const { register, login, isLoading, error, clearError } = useAuthStore();

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleChange = (e) => {
    setFormData((c) => ({ ...c, [e.target.name]: e.target.value }));
    setSuccessMessage('');
    setValidationError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccessMessage('');
    setValidationError('');
    const nextError = validateRegistrationForm(formData);
    if (nextError) {
      setValidationError(nextError);
      return;
    }
    try {
      await register(formData);
      dispatchOtp({
        type: 'SHOW',
        payload: {
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        },
      });
      setSuccessMessage('Verification code sent to your email.');
    } catch (submitError) {
      console.error(submitError);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    if (otpState.code.length !== 6) {
      dispatchOtp({ type: 'SET_ERROR', payload: 'Enter a 6-digit code.' });
      return;
    }
    dispatchOtp({ type: 'START_VERIFY' });
    try {
      await apiClient.post('/auth/verify-otp', {
        email: otpState.tempData.email,
        otp: otpState.code,
        purpose: 'VERIFICATION',
      });
      setSuccessMessage('Verified! Logging you in...');
      const user = await login(otpState.tempData.email, otpState.tempData.password);
      if (user.role === 'SUPER_ADMIN') navigate('/admin');
      else if (user.role === 'WHOLESALER') navigate('/wholesaler');
      else navigate('/store');
    } catch (err) {
      dispatchOtp({
        type: 'SET_ERROR',
        payload: err.response?.data?.error || 'Verification failed.',
      });
    } finally {
      dispatchOtp({ type: 'END_VERIFY' });
    }
  };

  const handleResendOtp = async () => {
    setSuccessMessage('');
    dispatchOtp({ type: 'START_RESEND' });
    try {
      await apiClient.post('/auth/send-otp', {
        email: otpState.tempData.email,
        purpose: 'VERIFICATION',
      });
      setSuccessMessage('Code resent!');
    } catch (err) {
      dispatchOtp({
        type: 'SET_ERROR',
        payload: err.response?.data?.error || 'Failed to resend.',
      });
    } finally {
      dispatchOtp({ type: 'END_RESEND' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-slate-50 to-orange-50/50 relative overflow-hidden text-[#1e293b] flex items-center justify-center p-4 sm:p-6 lg:p-10 selection:bg-[#4f46e5] selection:text-white">
      {/* Light Ambient Color Blobs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -right-20 w-96 h-96 bg-orange-400/15 rounded-full blur-3xl pointer-events-none" />

      {/* Centered Auth Card */}
      <div className="relative z-10 w-full max-w-[940px] rounded-3xl bg-white shadow-2xl shadow-indigo-950/10 border border-[#e2e8f0] overflow-hidden grid lg:grid-cols-[0.9fr_1.1fr]">
        <RegisterHeroBanner role={formData.role} />

        <div className="p-8 lg:p-10 flex flex-col justify-center overflow-y-auto max-h-[90vh] bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#1e293b]">Create account</h2>
              <p className="mt-0.5 text-xs font-medium text-[#64748b]">
                Get started on NexCart in under a minute
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

          {validationError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
              {validationError}
            </div>
          )}
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

          {otpState.show ? (
            <RegisterOtpStep
              otpState={otpState}
              handleOtpSubmit={handleOtpSubmit}
              dispatchOtp={dispatchOtp}
              handleResendOtp={handleResendOtp}
              setSuccessMessage={setSuccessMessage}
            />
          ) : (
            <RegisterFormFields
              formData={formData}
              setFormData={setFormData}
              handleChange={handleChange}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
            />
          )}

          <p className="mt-6 text-xs text-[#64748b] text-center">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-bold text-[#4f46e5] hover:text-[#4338ca] transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
