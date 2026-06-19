export default function StatCard({ title, value, icon: Icon, tone, desc }) {
  return (
    <div className="rounded-[22px] border border-zinc-800 bg-[#111111] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.24)]">
      <div className="mb-4 flex items-center justify-between">
        <div className={`rounded-xl border px-3 py-2 ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
          {title}
        </span>
      </div>
      <p className="text-2xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{desc}</p>
    </div>
  );
}
