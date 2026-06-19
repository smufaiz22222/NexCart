export default function InfoTile({ label, value, detail }) {
  return (
    <div className="rounded-[18px] border border-zinc-800 bg-[#0a0a0a] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-3 text-xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
    </div>
  );
}
