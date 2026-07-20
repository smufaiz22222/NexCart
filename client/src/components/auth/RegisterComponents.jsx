import { ArrowRight, Check, ShoppingBag, Store, Sparkles } from 'lucide-react';
import { passwordChecks } from './registerValidation';

const inputClass =
  'w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm text-[#0f172a] outline-none focus:bg-white focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 font-sans transition-all placeholder:text-[#94a3b8]';

export function RegisterHeroBanner({ role }) {
  return (
    <div className="relative p-8 lg:p-10 bg-[#1e1b4b] text-white flex flex-col justify-between overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-widest text-[#a5b4fc]">
          <Sparkles className="h-3 w-3 text-[#a5b4fc]" />
          NexCart Marketplace
        </div>

        <div className="flex items-center gap-2.5 mt-4">
          <span className="font-black text-2xl tracking-tight">
            Nex<span className="text-[#a5b4fc]">Cart</span>
          </span>
        </div>

        <h1 className="mt-6 text-3xl font-black tracking-tight leading-tight">
          Join India&apos;s B2B & Retail Network
        </h1>
        <p className="mt-3 text-xs text-[#c7d2fe] leading-relaxed max-w-sm">
          Connect directly with verified wholesalers, get bulk volume pricing, and grow your retail
          storefront effortlessly.
        </p>
      </div>

      {/* Role Selection Info */}
      <div className="relative z-10 my-6 space-y-3">
        <div
          className={`rounded-2xl border p-4 transition-all duration-300 ${
            role === 'CUSTOMER'
              ? 'bg-white/20 border-white/30 backdrop-blur-md'
              : 'bg-white/10 border-white/15'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                role === 'CUSTOMER' ? 'bg-[#4f46e5] text-white' : 'bg-white/10 text-white'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold">Customer Account</p>
              <p className="text-[10px] text-[#c7d2fe]">Shop, track orders, save wishlists</p>
            </div>
            {role === 'CUSTOMER' && <Check className="w-4 h-4 text-[#a5b4fc]" />}
          </div>
        </div>

        <div
          className={`rounded-2xl border p-4 transition-all duration-300 ${
            role === 'WHOLESALER'
              ? 'bg-white/20 border-white/30 backdrop-blur-md'
              : 'bg-white/10 border-white/15'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                role === 'WHOLESALER' ? 'bg-[#818cf8] text-[#1e1b4b]' : 'bg-white/10 text-white'
              }`}
            >
              <Store className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold">Wholesaler Account</p>
              <p className="text-[10px] text-[#c7d2fe]">List wholesale inventory, manage RFQs</p>
            </div>
            {role === 'WHOLESALER' && <Check className="w-4 h-4 text-[#a5b4fc]" />}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="relative z-10 mt-4 pt-4 border-t border-white/15 flex gap-6">
        <div>
          <p className="text-lg font-black">10K+</p>
          <p className="text-[9px] text-[#a5b4fc] uppercase tracking-wider font-semibold">
            Products
          </p>
        </div>
        <div>
          <p className="text-lg font-black">500+</p>
          <p className="text-[9px] text-[#a5b4fc] uppercase tracking-wider font-semibold">
            Sellers
          </p>
        </div>
        <div>
          <p className="text-lg font-black">50K+</p>
          <p className="text-[9px] text-[#a5b4fc] uppercase tracking-wider font-semibold">Orders</p>
        </div>
      </div>
    </div>
  );
}

export function RegisterOtpStep({
  otpState,
  handleOtpSubmit,
  dispatchOtp,
  handleResendOtp,
  setSuccessMessage,
}) {
  return (
    <div className="mt-5">
      {otpState.error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
          {otpState.error}
        </div>
      )}
      <p className="text-xs text-[#64748b] mb-4">
        Code sent to <span className="font-bold text-[#1e293b]">{otpState.tempData?.email}</span>
      </p>
      <form onSubmit={handleOtpSubmit} className="space-y-4">
        <input
          type="text"
          required
          maxLength={6}
          aria-label="Verification Code"
          value={otpState.code}
          onChange={(e) =>
            dispatchOtp({ type: 'SET_CODE', payload: e.target.value.replace(/\D/g, '') })
          }
          placeholder="000000"
          className="w-full text-center tracking-[0.5em] font-mono rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3.5 text-2xl text-[#0f172a] outline-none focus:bg-white focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 transition-all"
        />
        <button
          type="submit"
          disabled={otpState.isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#4f46e5]/20 disabled:opacity-50 transition-all"
        >
          {otpState.isLoading ? 'Verifying...' : 'Verify & Continue'}
          {!otpState.isLoading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
      <div className="mt-4 flex justify-between text-xs">
        <button
          type="button"
          onClick={handleResendOtp}
          disabled={otpState.isResending}
          className="font-bold text-[#4f46e5] hover:text-[#4338ca] disabled:opacity-50 transition-colors"
        >
          {otpState.isResending ? 'Resending...' : 'Resend code'}
        </button>
        <button
          type="button"
          onClick={() => {
            dispatchOtp({ type: 'RESET' });
            setSuccessMessage('');
          }}
          className="text-[#64748b] hover:text-[#1e293b] transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
}

export function RegisterFormFields({
  formData,
  setFormData,
  handleChange,
  handleSubmit,
  isLoading,
}) {
  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {/* Role Toggle */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#f1f5f9] rounded-2xl border border-[#e2e8f0]">
        <button
          type="button"
          onClick={() => setFormData((c) => ({ ...c, role: 'CUSTOMER' }))}
          className={`py-2 rounded-xl text-xs font-bold transition-all ${
            formData.role === 'CUSTOMER'
              ? 'bg-[#4f46e5] text-white shadow-md shadow-[#4f46e5]/20'
              : 'text-[#64748b] hover:text-[#1e293b]'
          }`}
        >
          Customer
        </button>
        <button
          type="button"
          onClick={() => setFormData((c) => ({ ...c, role: 'WHOLESALER' }))}
          className={`py-2 rounded-xl text-xs font-bold transition-all ${
            formData.role === 'WHOLESALER'
              ? 'bg-[#1e1b4b] text-white shadow-md shadow-[#1e1b4b]/20'
              : 'text-[#64748b] hover:text-[#1e293b]'
          }`}
        >
          Wholesaler
        </button>
      </div>

      <div>
        <label
          htmlFor="reg-name"
          className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5"
        >
          Full Name
        </label>
        <input
          id="reg-name"
          type="text"
          name="name"
          required
          aria-label="Full Name"
          value={formData.name}
          onChange={handleChange}
          placeholder="John Doe"
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="reg-email"
          className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5"
        >
          Email address
        </label>
        <input
          id="reg-email"
          type="email"
          name="email"
          required
          aria-label="Email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@example.com"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="reg-password"
            className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5"
          >
            Password
          </label>
          <input
            id="reg-password"
            type="password"
            name="password"
            required
            aria-label="Password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Min 8 chars"
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="reg-confirm-password"
            className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1.5"
          >
            Confirm
          </label>
          <input
            id="reg-confirm-password"
            type="password"
            name="confirmPassword"
            required
            aria-label="Confirm Password"
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
            className={`h-1 flex-1 rounded-full transition-all ${
              check.pattern.test(formData.password) ? 'bg-[#4f46e5]' : 'bg-[#e2e8f0]'
            }`}
          />
        ))}
      </div>

      {/* Wholesaler fields */}
      {formData.role === 'WHOLESALER' && (
        <div className="space-y-3 rounded-2xl border border-indigo-100 bg-[#eef2ff]/70 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#1e1b4b]">
            Business Details
          </p>
          <input
            type="text"
            name="businessName"
            required
            aria-label="Business / Shop Name"
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
              aria-label="Business Phone"
              value={formData.businessPhone}
              onChange={handleChange}
              placeholder="Phone"
              className={inputClass}
            />
            <input
              type="text"
              name="taxId"
              aria-label="GST"
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
            aria-label="Business Address"
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
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#4f46e5]/20 disabled:opacity-50 transition-all mt-6"
      >
        {isLoading
          ? 'Creating...'
          : formData.role === 'WHOLESALER'
            ? 'Submit Application'
            : 'Create Account'}
        {!isLoading && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}
