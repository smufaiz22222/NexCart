import { Landmark } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function B2BCartSettlementSection({
  seller,
  hasBank,
  hasUpi,
  paymentMode,
  setSelectedPaymentMode,
}) {
  return (
    <div className="border border-[#EFEFEF] rounded-xl p-5 bg-white">
      <h2 className="text-sm font-bold uppercase tracking-wider text-[#6C757D] mb-4 flex items-center gap-2">
        <Landmark className="w-4 h-4" /> Wholesaler Settlement Credentials
      </h2>
      {seller ? (
        <div className="space-y-4">
          {hasBank && hasUpi && (
            <div className="flex gap-2 p-1 bg-[#F5F5F7] rounded-lg">
              <button
                type="button"
                onClick={() => setSelectedPaymentMode('BANK')}
                className={cn(
                  'flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                  paymentMode === 'BANK'
                    ? 'bg-white text-[#0047AB] shadow-sm'
                    : 'text-[#6C757D] hover:text-[#16171a]'
                )}
              >
                <Landmark className="w-3.5 h-3.5" />
                Bank Transfer
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaymentMode('UPI')}
                className={cn(
                  'flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                  paymentMode === 'UPI'
                    ? 'bg-white text-[#0047AB] shadow-sm'
                    : 'text-[#6C757D] hover:text-[#16171a]'
                )}
              >
                <span className="font-sans font-black tracking-wider text-[10px]">UPI</span>
                UPI Payment
              </button>
            </div>
          )}

          {paymentMode === 'BANK' && hasBank && (
            <div className="border border-[#EFEFEF] rounded-lg p-3.5 text-xs space-y-2 bg-[#FBFBFB]">
              <p className="font-bold text-[#161412] flex items-center gap-1.5 pb-1.5 border-b border-[#EFEFEF]">
                <Landmark className="w-4 h-4 text-[#0047AB]" />
                Bank Settlement Details ({seller.businessName})
              </p>
              <p>
                <span className="text-[#6C757D] font-medium">Bank Name:</span>{' '}
                {seller.bankName || 'N/A'}
              </p>
              <p>
                <span className="text-[#6C757D] font-medium">Account Number:</span>{' '}
                <strong className="text-zinc-900 font-mono select-all bg-zinc-200/50 px-1 py-0.5 rounded">
                  {seller.bankAccountNo}
                </strong>
              </p>
              <p>
                <span className="text-[#6C757D] font-medium">IFSC Code:</span>{' '}
                <strong className="text-zinc-900 font-mono select-all bg-zinc-200/50 px-1 py-0.5 rounded">
                  {seller.bankIfsc || 'N/A'}
                </strong>
              </p>
            </div>
          )}

          {paymentMode === 'UPI' && hasUpi && (
            <div className="border border-[#EFEFEF] rounded-lg p-3.5 text-xs space-y-2 bg-[#FBFBFB]">
              <p className="font-bold text-[#161412] flex items-center gap-1.5 pb-1.5 border-b border-[#EFEFEF]">
                <span className="font-sans font-black tracking-wider text-[10px] text-[#0047AB]">
                  UPI
                </span>
                UPI Settlement Details ({seller.businessName})
              </p>
              <p>
                <span className="text-[#6C757D] font-medium">UPI ID:</span>{' '}
                <strong className="text-zinc-900 font-mono select-all bg-zinc-100 px-1.5 py-0.5 rounded">
                  {seller.upiId}
                </strong>
              </p>
              {seller.qrCodeUrl && (
                <div className="mt-3 flex flex-col items-center p-3 bg-white border border-[#EFEFEF] rounded-xl">
                  <img
                    src={seller.qrCodeUrl}
                    alt="UPI QR Code"
                    className="w-36 h-36 object-contain"
                  />
                  <p className="text-[10px] text-[#6C757D] mt-1.5 font-medium">
                    Scan to pay via UPI
                  </p>
                </div>
              )}
            </div>
          )}

          {!hasBank && !hasUpi && (
            <p className="text-amber-600 font-medium text-xs bg-amber-50 border border-amber-100 p-3 rounded-lg">
              Wholesaler has not configured direct settlement credentials yet.
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-[#6C757D]">No seller details found.</p>
      )}
    </div>
  );
}
