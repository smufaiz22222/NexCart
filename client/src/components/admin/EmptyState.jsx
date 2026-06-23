import { Inbox } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function EmptyState({ icon: Icon = Inbox, message, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#2B3139] bg-[#1E2329] px-6 py-10 text-center',
        className
      )}
    >
      <Icon className="h-10 w-10 text-[#5E6673]" />
      <p className="text-sm text-[#848E9C]">{message}</p>
    </div>
  );
}
