import { Banknote, CreditCard } from 'lucide-react';
import { cn } from '../../utils/cn';

const PAYMENT_OPTIONS = [
  { value: 'COD', label: 'Cash on Delivery', icon: Banknote },
  { value: 'PREPAID', label: 'Pay Online (Razorpay)', icon: CreditCard },
];

export default function PaymentMethodSection({ paymentMethod, setPaymentMethod }) {
  return (
    <div className="rounded-2xl bg-white p-5 border border-[#e2e8f0] shadow-sm">
      <h3 className="text-sm font-bold text-[#0f172a] mb-3">Payment Method</h3>
      <div className="flex flex-col gap-3 sm:flex-row">
        {PAYMENT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = paymentMethod === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setPaymentMethod(option.value)}
              className={cn(
                'flex-1 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left transition-all btn-press',
                isActive
                  ? 'border-[#4f46e5] bg-[#eef2ff] shadow-sm'
                  : 'border-[#e2e8f0] bg-[#f8fafc] hover:border-[#4f46e5]/40'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive ? 'text-[#4f46e5]' : 'text-[#94a3b8]')} />
              <span
                className={cn('text-xs font-bold', isActive ? 'text-[#4f46e5]' : 'text-[#64748b]')}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
