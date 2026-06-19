import { useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const user = await login(email, password);

      if (user.role === 'SUPER_ADMIN') {
        navigate('/admin');
      } else if (user.role === 'WHOLESALER') {
        navigate('/wholesaler');
      } else {
        navigate('/store');
      }
    } catch (submitError) {
      console.error(submitError);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f0ea] px-4 py-10 text-[#161412]">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl overflow-hidden rounded-[36px] border border-[#ddd7cc] bg-white shadow-[0_30px_90px_rgba(22,20,18,0.08)] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative overflow-hidden bg-[#161412] px-8 py-10 text-white sm:px-12 sm:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(227,190,120,0.18),_transparent_28%)]" />
          <div className="relative">
            <p className="text-sm font-black tracking-[0.24em]">NEXCART</p>
            <h1 className="mt-12 max-w-md text-5xl font-black leading-none tracking-tight sm:text-6xl">
              Fashion-first wholesale made easy.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-[#d8d1c5]">
              Sign in to continue shopping, track orders, save delivery addresses, and keep your
              cart synced across every session.
            </p>

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              <FeatureStat title="Secure access" value="JWT-protected" />
              <FeatureStat title="Saved checkout" value="Server cart" />
              <FeatureStat title="Delivery ready" value="Address book" />
              <FeatureStat title="Fast pay" value="COD + Razorpay" />
            </div>
          </div>
        </section>

        <section className="flex items-center px-6 py-10 sm:px-10">
          <div className="mx-auto w-full max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ddd7cc] bg-[#f8f6f1] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-[#8f5d31]">
              <ShieldCheck className="h-4 w-4" />
              Customer and seller login
            </div>

            <h2 className="mt-6 text-4xl font-black tracking-tight text-[#161412]">Welcome back</h2>
            <p className="mt-3 text-sm leading-7 text-[#6b665f]">
              Use the same account to buy as a customer, manage products as a wholesaler, or enter
              the admin panel if you have platform access.
            </p>

            {error && (
              <div className="mt-6 rounded-3xl border border-[#f0c6c0] bg-[#fff3f1] px-4 py-4 text-sm font-medium text-[#9d3b30]">
                {error}
              </div>
            )}

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <FormField label="Email">
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-[#ddd7cc] bg-[#fbfaf7] px-4 py-4 text-sm text-[#161412] outline-none transition focus:border-[#161412]"
                />
              </FormField>

              <FormField label="Password">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#8b857c]">
                    Password
                  </span>
                  <Link to="/forgot-password" className="text-xs font-semibold text-[#8f5d31]">
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#ddd7cc] bg-[#fbfaf7] px-4 py-4 text-sm text-[#161412] outline-none transition focus:border-[#161412]"
                />
              </FormField>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#161412] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#2a2724] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <p className="mt-8 text-sm text-[#6b665f]">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-bold text-[#161412] underline underline-offset-4"
              >
                Create one here
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
