import { cn } from '../../utils/cn';

export default function PageHeader({ icon: Icon, badge, title, description, className }) {
  return (
    <section
      className={cn(
        'rounded-xl border border-[#2B3139] bg-[#12161C] px-6 py-6',
        className
      )}
    >
      {badge && (
        <div className="inline-flex items-center gap-2 rounded-md bg-[#F0B90B]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#F0B90B]">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {badge}
        </div>
      )}
      <h1 className="mt-3 max-w-3xl text-2xl font-bold text-[#EAECEF] sm:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#848E9C]">{description}</p>
      )}
    </section>
  );
}
