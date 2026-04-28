import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  
  const { login, isLoading, error } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      
      if (user.role === 'SUPER_ADMIN') {
        navigate('/admin');
      } else if (user.role === 'WHOLESALER') {
        navigate('/wholesaler');
      } else {
        navigate('/store');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] font-sans selection:bg-amber-500/30 selection:text-amber-200 px-4 py-12">
      <div className="max-w-md w-full bg-[#1c1c1c] rounded-lg shadow-2xl border border-zinc-800 p-8 space-y-8">
        
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white tracking-wide">Sign In</h2>
          <p className="mt-2 text-sm text-zinc-400">Access your account</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-md text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="block w-full px-4 py-3 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="block w-full px-4 py-3 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3.5 px-4 mt-2 border border-transparent rounded-md shadow-[0_0_15px_rgba(245,158,11,0.15)] text-sm font-bold text-[#0a0a0a] bg-amber-500 hover:bg-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] focus:outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none active:scale-[0.98]"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-400 border-t border-zinc-800 pt-6">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-amber-500 hover:text-amber-400 hover:underline transition-colors">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
