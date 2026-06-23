import { cn } from '../../utils/cn';

const variants = {
  success: 'bg-[#0ECB81]/10 text-[#0ECB81] border-[#0ECB81]/20',
  warning: 'bg-[#F0B90B]/10 text-[#F0B90B] border-[#F0B90B]/20',
  danger: 'bg-[#F6465D]/10 text-[#F6465D] border-[#F6465D]/20',
  info: 'bg-[#1E9CF1]/10 text-[#1E9CF1] border-[#1E9CF1]/20',
  neutral: 'bg-[#2B3139] text-[#848E9C] border-[#2B3139]',
  dark: 'bg-[#F0B90B] text-[#0B0E11] border-[#F0B90B]',
};

export default function StatusBadge({ children, variant = 'neutral', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
