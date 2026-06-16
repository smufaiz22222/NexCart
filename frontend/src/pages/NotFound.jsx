import { HelpCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 flex flex-col items-center justify-center p-6 font-sans">
      <div className="text-center space-y-6 max-w-md">
        <div className="relative inline-flex items-center justify-center">
          {/* Pulsing ring background */}
          <div className="absolute h-24 w-24 rounded-full border border-amber-500/10 animate-pulse"></div>
          <HelpCircle className="h-16 w-16 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]" />
        </div>

        <div className="space-y-2">
          <h1 className="text-5xl font-black text-white tracking-tight">404</h1>
          <h2 className="text-xl font-bold text-zinc-200">Page Not Found</h2>
          <p className="text-sm text-zinc-500">
            The page you are looking for might have been removed, had its name changed, or is
            temporarily unavailable.
          </p>
        </div>

        <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center px-6 py-3 border border-amber-500/30 text-amber-500 font-bold rounded-md hover:bg-amber-500/10 hover:border-amber-500 transition-all active:scale-[0.98] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
