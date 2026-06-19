export default function MetricCard({ label, value, isLoading }) {
  return (
    <div className="rounded-[24px] border border-zinc-800 bg-[#141414] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-500">{label}</p>
      <p className="mt-4 text-2xl font-black tracking-tight text-white">
        {isLoading ? '...' : value}
      </p>
    </div>
  );
}
