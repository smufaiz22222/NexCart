export default function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#111111] px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-white">{value}</p>
    </div>
  );
}
