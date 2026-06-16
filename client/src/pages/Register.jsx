import { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CUSTOMER',
    businessName: '',
  });

  const navigate = useNavigate();
  const { register, isLoading, error } = useAuthStore();

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await register(formData);
      alert('Registration successful! Welcome to the marketplace.');
      navigate('/login');
    } catch (submitError) {
      console.error(submitError);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f0ea] px-4 py-10 text-[#161412]">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl overflow-hidden rounded-[36px] border border-[#ddd7cc] bg-white shadow-[0_30px_90px_rgba(22,20,18,0.08)] lg:grid-cols-[0.96fr_1.04fr]">
        <section className="border-b border-[#ddd7cc] bg-[#faf8f4] px-8 py-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-14">
          <p className="text-sm font-black tracking-[0.24em] text-[#161412]">SHOP.CO</p>
          <h1 className="mt-10 text-5xl font-black leading-none tracking-tight text-[#161412]">
            Join the marketplace on your terms.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-[#6b665f]">
            Create a buyer account for fashion-style discovery or a wholesaler account to sell,
            track orders, and manage stock in one place.
          </p>

          <div className="mt-10 space-y-4">
            <RolePreview
              title="Customer"
              subtitle="Browse curated arrivals, save addresses, and track orders."
              active={formData.role === 'CUSTOMER'}
              icon={ShoppingBag}
            />
            <RolePreview
              title="Wholesaler"
              subtitle="List products, monitor inventory, and run your seller dashboard."
              active={formData.role === 'WHOLESALER'}
              icon={BriefcaseBusiness}
            />
          </div>
        </section>

        <section className="flex items-center px-6 py-10 sm:px-10">
          <div className="mx-auto w-full max-w-lg">
            <div className="inline-flex rounded-full border border-[#ddd7cc] bg-[#f8f6f1] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-[#8f5d31]">
              New account
            </div>
            <h2 className="mt-6 text-4xl font-black tracking-tight text-[#161412]">
              Create account
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#6b665f]">
              Pick the role that matches your workflow. You can start shopping as a customer or
              start selling as a wholesaler right away.
            </p>

            {error && (
              <div className="mt-6 rounded-3xl border border-[#f0c6c0] bg-[#fff3f1] px-4 py-4 text-sm font-medium text-[#9d3b30]">
                {error}
              </div>
            )}

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <RoleButton
                  title="Buy Products"
                  subtitle="Customer"
                  active={formData.role === 'CUSTOMER'}
                  onClick={() => setFormData((current) => ({ ...current, role: 'CUSTOMER' }))}
                />
                <RoleButton
                  title="Sell Products"
                  subtitle="Wholesaler"
                  active={formData.role === 'WHOLESALER'}
                  onClick={() => setFormData((current) => ({ ...current, role: 'WHOLESALER' }))}
                />
              </div>

              <input type="hidden" name="role" value={formData.role} />

              <FormField label="Full Name">
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className="w-full rounded-2xl border border-[#ddd7cc] bg-[#fbfaf7] px-4 py-4 text-sm text-[#161412] outline-none transition focus:border-[#161412]"
                />
              </FormField>

              <FormField label="Email">
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-[#ddd7cc] bg-[#fbfaf7] px-4 py-4 text-sm text-[#161412] outline-none transition focus:border-[#161412]"
                />
              </FormField>

              <FormField label="Password">
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  className="w-full rounded-2xl border border-[#ddd7cc] bg-[#fbfaf7] px-4 py-4 text-sm text-[#161412] outline-none transition focus:border-[#161412]"
                />
              </FormField>

              {formData.role === 'WHOLESALER' && (
                <FormField label="Business / Shop Name">
                  <input
                    type="text"
                    name="businessName"
                    required
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder="Your brand or store name"
                    className="w-full rounded-2xl border border-[#d2b08a] bg-[#fff8ee] px-4 py-4 text-sm text-[#161412] outline-none transition focus:border-[#8f5d31]"
                  />
                </FormField>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#161412] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#2a2724] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <p className="mt-8 text-sm text-[#6b665f]">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-[#161412] underline underline-offset-4">
                Sign in
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

function RoleButton({ title, subtitle, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[24px] border px-4 py-4 text-left transition ${
        active
          ? 'border-[#161412] bg-[#161412] text-white'
          : 'border-[#ddd7cc] bg-[#fbfaf7] text-[#161412]'
      }`}
    >
      <p className="text-sm font-black tracking-tight">{title}</p>
      <p className={`mt-1 text-xs ${active ? 'text-[#d8d1c5]' : 'text-[#6b665f]'}`}>{subtitle}</p>
    </button>
  );
}

function RolePreview({ title, subtitle, icon: Icon, active }) {
  return (
    <div
      className={`rounded-[28px] border px-5 py-5 transition ${
        active ? 'border-[#161412] bg-white' : 'border-[#ddd7cc] bg-white/60'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[#161412] p-3 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-black tracking-tight text-[#161412]">{title}</p>
          <p className="mt-1 text-sm text-[#6b665f]">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
