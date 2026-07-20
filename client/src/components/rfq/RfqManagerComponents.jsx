import { MessageSquare, Clock } from 'lucide-react';
import { cn } from '../../utils/cn';

export function RfqManagerSkeleton({ isWholesalerPath }) {
  return (
    <div
      className={cn(
        'max-w-6xl mx-auto px-4 py-8 space-y-8 animate-pulse',
        isWholesalerPath ? 'text-zinc-200' : 'text-[#16171a]'
      )}
    >
      <div
        className={cn(
          'h-24 rounded-lg border',
          isWholesalerPath ? 'bg-zinc-900 border-zinc-800' : 'bg-[#EFEFEF] border-[#C0C0C0]'
        )}
      />
      <div className="space-y-4">
        <div
          className={cn(
            'h-48 rounded-lg border',
            isWholesalerPath ? 'bg-zinc-900 border-zinc-800' : 'bg-[#EFEFEF] border-[#C0C0C0]'
          )}
        />
        <div
          className={cn(
            'h-48 rounded-lg border',
            isWholesalerPath ? 'bg-zinc-900 border-zinc-800' : 'bg-[#EFEFEF] border-[#C0C0C0]'
          )}
        />
      </div>
    </div>
  );
}

export function RfqHeaderBanner({ isWholesalerPath, isWholesaler }) {
  return (
    <div
      className={cn(
        'flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-6 mb-8',
        isWholesalerPath ? 'border-zinc-800' : 'border-[#C0C0C0]'
      )}
    >
      <div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border',
            isWholesalerPath
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-[#EFEFEF] text-[#0047AB] border-[#C0C0C0]'
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" /> B2B Price Desk
        </span>
        <h1
          className={cn(
            'text-3xl font-bold mt-4 tracking-tight',
            isWholesalerPath ? 'text-white' : 'text-[#16171a]'
          )}
        >
          RFQ Negotiation Room
        </h1>
        <p className={cn('text-sm mt-2', isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]')}>
          {isWholesaler
            ? 'Review custom quote bids, approve pricing tiers, or counter-propose custom invoice rates.'
            : 'Monitor custom quotes, review counter-offers, and proceed to checkout at accepted rates.'}
        </p>
      </div>
    </div>
  );
}

export function RfqEmptyState({ isWholesalerPath, isWholesaler, title, description }) {
  return (
    <div
      className={cn(
        'border-dashed p-16 text-center flex flex-col items-center justify-center rounded-2xl border',
        isWholesalerPath ? 'bg-[#111111] border-zinc-800' : 'swiss-panel'
      )}
    >
      <Clock
        className={cn(
          'w-12 h-12 mb-4 stroke-[1.5]',
          isWholesalerPath ? 'text-zinc-600' : 'text-[#C0C0C0]'
        )}
      />
      <h3 className={cn('text-lg font-bold', isWholesalerPath ? 'text-white' : 'text-[#16171a]')}>
        {title}
      </h3>
      <p
        className={cn(
          'text-sm mt-1 max-w-md',
          isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
        )}
      >
        {description ||
          (isWholesaler
            ? 'When B2B business buyers request custom prices for your products, they will show up here.'
            : 'You haven\'t requested any custom prices yet. Use "Request Quote" on product detail pages.')}
      </p>
    </div>
  );
}
