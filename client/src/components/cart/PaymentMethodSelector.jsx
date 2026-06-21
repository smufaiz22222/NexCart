import React from 'react';
import { cn } from '../../utils/cn';

export default function PaymentMethodSelector({ paymentMethod, setPaymentMethod }) {
  const options = [
    {
      value: 'COD',
      label: 'Cash on Delivery',
      description: 'Pay when your order arrives.',
    },
    {
      value: 'PREPAID',
      label: 'Prepaid with Razorpay',
      description: 'Complete the payment securely online.',
    },
  ];

  return (
    <div className="mt-6 space-y-3">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setPaymentMethod(option.value)}
          className={cn(
            'w-full rounded-[24px] border p-4 text-left transition',
            paymentMethod === option.value
              ? 'border-white bg-white text-[#161412]'
              : 'border-white/15 bg-white/8 text-white'
          )}
        >
          <p className="font-black tracking-tight">{option.label}</p>
          <p
            className={cn(
              'mt-2 text-xs leading-6',
              paymentMethod === option.value ? 'text-[#6b665f]' : 'text-[#d8d1c5]'
            )}
          >
            {option.description}
          </p>
        </button>
      ))}
    </div>
  );
}
