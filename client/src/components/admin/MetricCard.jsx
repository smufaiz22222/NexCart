import { cn } from '../../utils/cn';

export default function MetricCard({ label, value, icon: Icon, accent, detail, className }) {
  return (
    <div className={cn('rounded-xl border border-[#2B3139] bg-[#1E2329] p-4', className)}>
      {Icon && (
        <div
          className={cn('inline-flex rounded-lg p-2', accent || 'bg-[#F0B90B]/10 text-[#F0B90B]')}
        >
          <Icon className="h-4 w-4" />
        </div>
      )}
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[#848E9C]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#EAECEF]">{value}</p>
      {detail && <p className="mt-1.5 text-xs text-[#5E6673]">{detail}</p>}
    </div>
  );
}
