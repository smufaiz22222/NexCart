import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(formData);
      alert('Registration successful! Welcome to the marketplace.');
      navigate('/login');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] font-sans selection:bg-amber-500/30 selection:text-amber-200 px-4 py-12">
      <div className="max-w-md w-full bg-[#1c1c1c] rounded-lg shadow-2xl border border-zinc-800 p-8 space-y-8">
        
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white tracking-wide">Create Account</h2>
          <p className="mt-2 text-sm text-zinc-400">Join the Global Marketplace</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-md text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">I want to...</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="block w-full px-4 py-3 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right .5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
            >
              <option value="CUSTOMER">Buy Products (Customer)</option>
              <option value="WHOLESALER">Sell Products (Wholesaler)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Full Name</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              className="block w-full px-4 py-3 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="block w-full px-4 py-3 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="block w-full px-4 py-3 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
            />
          </div>

          {/* Dynamic Field: Only show if Wholesaler */}
          {formData.role === 'WHOLESALER' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-xs font-bold text-amber-500/80 uppercase tracking-wider mb-1.5">Business / Shop Name</label>
              <input
                type="text"
                name="businessName"
                required
                value={formData.businessName}
                onChange={handleChange}
                placeholder="Acme Corp"
                className="block w-full px-4 py-3 bg-[#0a0a0a] border border-amber-500/30 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
              />
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3.5 px-4 mt-2 border border-transparent rounded-md shadow-[0_0_15px_rgba(245,158,11,0.15)] text-sm font-bold text-[#0a0a0a] bg-amber-500 hover:bg-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] focus:outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none active:scale-[0.98]"
          >
            {isLoading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-400 border-t border-zinc-800 pt-6">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-amber-500 hover:text-amber-400 hover:underline transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}