import { cn } from '../../utils/cn';

export function MetricCard({ icon: Icon, label, value, subtitle, tone = 'amber' }) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
      : tone === 'rose'
        ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
        : 'border-amber-500/20 bg-amber-500/10 text-amber-200';

  return (
    <div className={cn('rounded-2xl border p-4', toneClass)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.24em] opacity-80">{label}</p>
        <Icon className="h-5 w-5 opacity-80" />
      </div>
      <p className="mt-4 text-2xl font-black tracking-tight">{value}</p>
      {subtitle ? <p className="mt-1 text-xs font-semibold opacity-70">{subtitle}</p> : null}
    </div>
  );
}

export function SectionCard({ title, description, action, children }) {
  return (
    <section className="rounded-[24px] border border-zinc-800 bg-[#121212] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function ModalShell({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-zinc-800 bg-[#111111] shadow-2xl">
        <div className="flex items-start justify-between border-b border-zinc-800 px-6 py-5">
          <div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-zinc-400">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}
