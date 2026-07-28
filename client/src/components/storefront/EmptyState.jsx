export default function EmptyState({ title, description, onClear }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-[#e2e8f0] bg-white px-6 py-14 text-center">
      <p className="text-xl font-black tracking-tight text-[#1e293b]">{title}</p>
      <p className="mt-3 text-sm leading-7 text-[#64748b]">{description}</p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 rounded-full bg-[#4f46e5] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#4338ca]"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
}
