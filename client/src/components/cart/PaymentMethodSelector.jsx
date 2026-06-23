import React from 'react';
import { cn } from '../../utils/cn';
import { Banknote, CreditCard } from 'lucide-react';

export default function PaymentMethodSelector({ paymentMethod, setPaymentMethod }) {
  const options = [
    {
      value: 'COD',
      label: 'Cash on Delivery',
      icon: Banknote,
    },
    {
      value: 'PREPAID',
      label: 'Pay Online',
      icon: CreditCard,
    },
  ];

  return (
    <div className="mt-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 mb-2.5">
        Payment Method
      </p>
      <div className="flex gap-2">
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = paymentMethod === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setPaymentMethod(option.value)}
              className={cn(
                'flex-1 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all',
                isActive
                  ? 'border-white bg-white text-[#1e1b4b]'
                  : 'border-white/15 bg-white/5 text-indigo-200 hover:bg-white/10'
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? 'text-[#4f46e5]' : 'text-indigo-300')} />
              <span className="text-xs font-bold">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
