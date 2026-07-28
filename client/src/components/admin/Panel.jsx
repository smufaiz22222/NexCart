import { cn } from '../../utils/cn';

export default function Panel({ title, eyebrow, icon: Icon, children, className, action }) {
  return (
    <section className={cn('rounded-xl border border-[#2B3139] bg-[#12161C] p-5', className)}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#848E9C]">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-1 text-lg font-bold text-[#EAECEF]">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {action}
          {Icon && (
            <div className="rounded-lg bg-[#1E2329] p-2.5 text-[#F0B90B]">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}
