import { cn } from '../../utils/cn';

const FILTER_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING_ACTIONS', label: 'Pending Actions' },
  { id: 'ACCEPTED', label: 'Accepted' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'PAID', label: 'Paid / Processing' },
  { id: 'COMPLETED', label: 'Completed' },
];

export default function RfqFilterTabs({
  selectedFilter,
  setSelectedFilter,
  counts,
  isWholesalerPath,
}) {
  return (
    <div className="flex flex-wrap gap-2 p-1.5 rounded-xl border border-zinc-800/10 bg-zinc-950/5 max-w-max mb-6">
      {FILTER_TABS.map((tab) => {
        const count = counts[tab.id];
        const isActive = selectedFilter === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedFilter(tab.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 border',
              isActive
                ? isWholesalerPath
                  ? 'bg-amber-500/25 border-amber-500/35 text-amber-400 font-extrabold shadow-[0_2px_10px_rgba(245,158,11,0.1)]'
                  : 'bg-[#0047AB] border-[#0047AB] text-white font-extrabold'
                : isWholesalerPath
                  ? 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  : 'bg-transparent border-transparent text-zinc-600 hover:text-[#16171a] hover:bg-[#EFEFEF]'
            )}
          >
            {tab.label}
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-mono leading-none border',
                isActive
                  ? isWholesalerPath
                    ? 'bg-amber-500/30 border-amber-500/20 text-amber-300'
                    : 'bg-white/20 border-white/10 text-white'
                  : isWholesalerPath
                    ? 'bg-zinc-900/80 border-zinc-800 text-zinc-500'
                    : 'bg-[#EFEFEF] border-[#C0C0C0] text-zinc-500'
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
