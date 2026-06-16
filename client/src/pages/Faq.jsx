import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function Faq() {
  const faqData = [
    {
      question: 'How do I place an order?',
      answer:
        'Simply browse our storefront, add the items to your cart, and proceed to checkout. If you are not logged in, you will be prompted to sign in or create a customer account. Once authenticated, you can select your delivery address and choose between cash-on-delivery (COD) or prepaid Razorpay options.',
    },
    {
      question: 'What are the shipping costs and delivery times?',
      answer:
        'Standard delivery takes between 3 to 7 business days depending on your locality. Shipping is calculated at checkout depending on the wholesaler location and your delivery address. Orders above ₹1,000 qualify for free standard delivery.',
    },
    {
      question: 'Can I buy products as a guest?',
      answer:
        'Yes! You can browse the catalog and add products to your cart completely as a guest without signing in. However, to complete checkout, secure your order, and log delivery details, you will need to sign in or sign up via our quick modal login popup during checkout.',
    },
    {
      question: 'How do returns and refunds work?',
      answer:
        'You can request a return directly from your Order Details panel within 7 days of receiving the item. Once the wholesaler receives and approves the returned item, your refund will be processed back to your source account or recorded in your customer ledger.',
    },
    {
      question: 'What is the AI Khatta ledger?',
      answer:
        'The AI Khatta ledger digitizes handwritten billing books using Gemini Vision. Wholesalers scan paper logs to automatically generate billing records. Customers can view their credit/debit balances in real-time on their Account dashboard.',
    },
  ];

  const [activeIndex, setActiveIndex] = useState(null);

  const toggleAccordion = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className="space-y-12 pb-16 text-[#161412] max-w-4xl mx-auto">
      {/* Header */}
      <section className="text-center space-y-4 pt-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#161412]/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-[#8f5d31]">
          <HelpCircle className="h-4.5 w-4.5" />
          Help Center
        </div>
        <h1 className="text-5xl font-black leading-none tracking-tight sm:text-6xl">
          Frequently Asked Questions
        </h1>
        <p className="text-base leading-8 text-[#6b665f]">
          Got questions? We have answers. If you do not find what you are looking for, contact our
          support team.
        </p>
      </section>

      {/* Accordions */}
      <section className="rounded-[36px] bg-white p-6 sm:p-10 shadow-[0_18px_45px_rgba(22,20_18,0.04)] divide-y divide-[#ece7de]">
        {faqData.map((item, index) => {
          const isOpen = activeIndex === index;
          return (
            <div key={index} className="py-5 first:pt-0 last:pb-0">
              <button
                onClick={() => toggleAccordion(index)}
                className="flex w-full items-center justify-between text-left focus:outline-none"
              >
                <span className="text-lg font-black tracking-tight text-[#161412]">
                  {item.question}
                </span>
                <span className="rounded-full bg-[#fbfaf7] border border-[#ece7de] p-2 text-[#161412]">
                  {isOpen ? (
                    <ChevronUp className="h-4.5 w-4.5" />
                  ) : (
                    <ChevronDown className="h-4.5 w-4.5" />
                  )}
                </span>
              </button>

              {isOpen && (
                <div className="mt-4 text-sm leading-8 text-[#5f5951] pr-12 animate-fade-in">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
