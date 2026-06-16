import { Loader2 } from 'lucide-react';

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center space-y-4">
      <div className="relative flex items-center justify-center">
        {/* Outer pulse ring for premium feel */}
        <div className="absolute h-12 w-12 rounded-full border-2 border-amber-500/10 animate-ping opacity-60"></div>
        <Loader2 className="h-10 w-10 text-amber-500 animate-spin drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
      </div>
      <p className="text-zinc-500 text-[10px] font-mono tracking-widest uppercase animate-pulse">
        Loading NexCart...
      </p>
    </div>
  );
}
