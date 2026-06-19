export default function QuickStrip({ label, value, detail }) {
  return (
    <div className="rounded-[18px] border border-zinc-800 bg-[#0a0a0a] px-4 py-4">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>
    </div>
  );
}
