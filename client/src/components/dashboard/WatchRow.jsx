export default function WatchRow({ name, meta, detail, tone }) {
  return (
    <div className={`rounded-[18px] border p-4 transition hover:opacity-90 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate">{name}</p>
          <p className="mt-1 text-xs leading-5 opacity-80">{detail}</p>
        </div>
        <span className="text-[11px] font-black uppercase tracking-[0.18em] shrink-0 whitespace-nowrap">
          {meta}
        </span>
      </div>
    </div>
  );
}
