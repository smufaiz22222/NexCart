import { Upload } from 'lucide-react';

export default function B2BCartPaymentProofSection({
  paymentMode,
  paymentReferenceNo,
  setPaymentReferenceNo,
  paymentReceiptUrl,
  setPaymentReceiptUrl,
}) {
  return (
    <div className="border border-[#EFEFEF] rounded-xl p-5 bg-white space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-[#6C757D] flex items-center gap-2">
        <Upload className="w-4 h-4" /> Payment Confirmation
      </h2>
      <p className="text-xs text-[#6C757D] mb-4 leading-5">
        {paymentMode === 'UPI'
          ? "Pay the total amount to the wholesaler's UPI ID above, then provide your transaction reference number and a receipt screenshot below."
          : "Transfer the total amount to the wholesaler's bank account above, then provide your transaction reference ID (UTR) and a receipt screenshot below."}
      </p>
      <div className="space-y-3">
        <div>
          <label
            htmlFor="b2b-cart-payment-reference"
            className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1"
          >
            {paymentMode === 'UPI'
              ? 'UPI Transaction ID / Ref No'
              : 'Transaction Reference ID / UTR'}
          </label>
          <input
            id="b2b-cart-payment-reference"
            type="text"
            value={paymentReferenceNo}
            onChange={(e) => setPaymentReferenceNo(e.target.value)}
            placeholder={paymentMode === 'UPI' ? 'e.g. txn_1234567890' : 'e.g. UTR1234567890'}
            className="w-full px-3 py-2.5 border border-[#EFEFEF] rounded-lg text-sm focus:outline-none focus:border-[#0047AB] transition"
          />
        </div>
        <div>
          <label
            htmlFor="b2b-cart-payment-receipt-url"
            className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1"
          >
            Payment Receipt Screenshot URL
          </label>
          <input
            id="b2b-cart-payment-receipt-url"
            type="text"
            value={paymentReceiptUrl}
            onChange={(e) => setPaymentReceiptUrl(e.target.value)}
            placeholder="Paste image link of payment receipt"
            className="w-full px-3 py-2.5 border border-[#EFEFEF] rounded-lg text-sm focus:outline-none focus:border-[#0047AB] transition"
          />
        </div>
      </div>
    </div>
  );
}
