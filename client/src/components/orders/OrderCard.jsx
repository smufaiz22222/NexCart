import { useState } from 'react';
import { MapPin, MessageSquareWarning, Store, Undo2, User, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';
import { StatusBadge, PaymentBadge } from './OrderBadges';
import OrderItem from './OrderItem';
import IssueSubmitForm from './IssueSubmitForm';
import DisputeCard from './DisputeCard';
import IssueCard from './IssueCard';
import { useUpdateOrderStatus } from '../../api/queries';

const canCustomerOpenIssue = (orderStatus) =>
  ['SHIPPED', 'DELIVERED', 'PROCESSING'].includes(orderStatus);

export default function OrderCard({ order, user, isWholesalerPath }) {
  const [showIssueForm, setShowIssueForm] = useState(false);
  const updateOrderStatusMutation = useUpdateOrderStatus();

  const handleUpdateStatus = (newStatus) => {
    updateOrderStatusMutation.mutate(
      { orderId: order.id, status: newStatus },
      {
        onSuccess: () => {
          toast.success(`Order status updated to ${newStatus}`);
        },
        onError: (err) => {
          console.error('Failed to update status:', err);
          toast.error(err.response?.data?.error || 'Failed to update order status');
        },
      }
    );
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border transition-all duration-300 shadow-md',
        isWholesalerPath
          ? 'bg-[#1c1c1c] border-zinc-800 hover:border-zinc-700'
          : 'swiss-card bg-white border-[#ddd7cc] hover:border-[#c8c1b4] group'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'px-6 py-4 border-b flex flex-wrap justify-between items-center gap-6',
          isWholesalerPath ? 'bg-zinc-900/60 border-zinc-800' : 'bg-[#EFEFEF] border-[#C0C0C0]'
        )}
      >
        <div className="flex flex-wrap gap-8">
          <div>
            <p
              className={cn(
                'text-[10px] uppercase tracking-wider font-semibold mb-1',
                isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
              )}
            >
              Order Placed
            </p>
            <p
              className={cn(
                'text-sm font-bold font-mono',
                isWholesalerPath ? 'text-zinc-300' : 'text-[#16171a]'
              )}
            >
              {new Date(order.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          <div>
            <p
              className={cn(
                'text-[10px] uppercase tracking-wider font-semibold mb-1',
                isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
              )}
            >
              Total
            </p>
            <p
              className={cn(
                'text-sm font-bold font-mono',
                isWholesalerPath ? 'text-amber-400' : 'text-[#0047AB]'
              )}
            >
              ₹{Number(order.totalAmount).toFixed(2)}
            </p>
          </div>
          <div>
            <p
              className={cn(
                'text-[10px] uppercase tracking-wider font-semibold flex items-center mb-1',
                isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
              )}
            >
              {user?.role === 'WHOLESALER' ? (
                <>
                  <User className="w-3 h-3 mr-1.5" /> Buyer
                </>
              ) : (
                <>
                  <Store className="w-3 h-3 mr-1.5" /> Sold By
                </>
              )}
            </p>
            <p
              className={cn(
                'text-sm font-semibold',
                isWholesalerPath ? 'text-zinc-300' : 'text-[#16171a]'
              )}
            >
              {user?.role === 'WHOLESALER' ? order.buyer?.name : order.seller?.businessName}
            </p>
          </div>
          <div>
            <p
              className={cn(
                'text-[10px] uppercase tracking-wider font-semibold mb-1',
                isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
              )}
            >
              Payment
            </p>
            <PaymentBadge
              method={order.paymentMethod}
              status={order.paymentStatus}
              isWholesalerPath={isWholesalerPath}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <span
            className={cn(
              'text-[11px] font-mono px-2.5 py-1 rounded-md border',
              isWholesalerPath
                ? 'text-zinc-400 bg-zinc-950 border-zinc-800'
                : 'text-[#16171a] bg-white border-[#C0C0C0]'
            )}
          >
            ID: {order.id.slice(0, 8).toUpperCase()}
          </span>
          <StatusBadge status={order.status} isWholesalerPath={isWholesalerPath} />
        </div>
      </div>

      {/* Items List */}
      <div className="p-6">
        <ul className={cn('divide-y', isWholesalerPath ? 'divide-zinc-800' : 'divide-[#C0C0C0]')}>
          {order.items.map((item) => (
            <OrderItem
              key={item.id}
              item={item}
              orderId={order.id}
              orderStatus={order.status}
              user={user}
              isWholesalerPath={isWholesalerPath}
            />
          ))}
        </ul>
      </div>

      {/* Disputes and Issues Form / List */}
      <div className="px-6 pb-6">
        <div
          className={cn(
            'rounded-md border p-5',
            isWholesalerPath ? 'border-zinc-800 bg-zinc-900/40' : 'border-[#C0C0C0] bg-[#EFEFEF]/30'
          )}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h3
                className={cn(
                  'text-sm font-bold uppercase tracking-wider flex items-center gap-2',
                  isWholesalerPath ? 'text-zinc-200' : 'text-[#16171a]'
                )}
              >
                <MessageSquareWarning
                  className={cn('h-4 w-4', isWholesalerPath ? 'text-amber-400' : 'text-[#0047AB]')}
                />
                Refund Requests and Disputes
              </h3>
              <p
                className={cn(
                  'text-xs mt-1',
                  isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]'
                )}
              >
                {user?.role === 'WHOLESALER'
                  ? 'Review refund requests, investigate disputes, and record seller decisions.'
                  : 'Use the refund form here, and open item-level disputes from the item actions above.'}
              </p>
            </div>

            {user?.role === 'CUSTOMER' && canCustomerOpenIssue(order.status) && (
              <button
                type="button"
                onClick={() => setShowIssueForm((prev) => !prev)}
                className="text-xs font-semibold uppercase tracking-wider bg-[#0047AB] hover:bg-[#003B91] text-white px-4 py-2.5 rounded-md transition-colors"
              >
                {showIssueForm ? 'Hide Request Form' : 'Open Request'}
              </button>
            )}
          </div>

          {user?.role === 'CUSTOMER' && showIssueForm && (
            <IssueSubmitForm order={order} onSuccess={() => setShowIssueForm(false)} />
          )}

          {!order.disputes?.length && !order.issues?.length ? (
            <div
              className={cn(
                'rounded-md border border-dashed px-4 py-6 text-sm text-center',
                isWholesalerPath
                  ? 'border-zinc-800 bg-[#1c1c1c] text-zinc-500'
                  : 'border-[#C0C0C0] bg-white text-[#6C757D]'
              )}
            >
              No refund requests or disputes for this order yet.
            </div>
          ) : (
            <div className="space-y-4">
              {(order.disputes || []).map((dispute) => (
                <DisputeCard
                  key={dispute.id}
                  dispute={dispute}
                  user={user}
                  isWholesalerPath={isWholesalerPath}
                />
              ))}

              {(order.issues || []).map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  user={user}
                  isWholesalerPath={isWholesalerPath}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className={cn(
          'px-6 py-4 border-t flex flex-col md:flex-row justify-between items-start md:items-center gap-6',
          isWholesalerPath ? 'bg-zinc-900/50 border-zinc-800' : 'bg-[#EFEFEF] border-[#C0C0C0]'
        )}
      >
        <div
          className={cn(
            'text-sm flex items-start max-w-sm',
            isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]'
          )}
        >
          <MapPin
            className={cn(
              'h-4 w-4 mr-2.5 mt-0.5 flex-shrink-0',
              isWholesalerPath ? 'text-amber-400' : 'text-[#0047AB]'
            )}
          />
          <span className="leading-relaxed font-mono text-xs">
            {order.shippingAddress || 'No address provided for this order.'}
          </span>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {user?.role === 'WHOLESALER' && order.status === 'PENDING' && (
            <button
              onClick={() => handleUpdateStatus('PROCESSING')}
              className={cn(
                'w-full md:w-auto text-xs font-semibold uppercase tracking-wider border px-5 py-2.5 rounded-md transition-all',
                isWholesalerPath
                  ? 'bg-zinc-800 border-zinc-750 hover:bg-zinc-700 text-amber-400'
                  : 'bg-white border-[#C0C0C0] hover:bg-[#EFEFEF] text-[#0047AB]'
              )}
            >
              Mark as Processing
            </button>
          )}
          {user?.role === 'WHOLESALER' && order.status === 'PROCESSING' && (
            <button
              onClick={() => handleUpdateStatus('SHIPPED')}
              className={cn(
                'w-full md:w-auto text-xs font-semibold uppercase tracking-wider border px-5 py-2.5 rounded-md transition-all',
                isWholesalerPath
                  ? 'bg-zinc-800 border-zinc-750 hover:bg-zinc-700 text-amber-400'
                  : 'bg-white border-[#C0C0C0] hover:bg-[#EFEFEF] text-[#0047AB]'
              )}
            >
              Mark as Shipped
            </button>
          )}
          {user?.role === 'WHOLESALER' && order.status === 'SHIPPED' && (
            <button
              onClick={() => handleUpdateStatus('DELIVERED')}
              className={cn(
                'w-full md:w-auto text-xs font-semibold uppercase tracking-wider px-5 py-2.5 rounded-md transition-all',
                isWholesalerPath
                  ? 'bg-amber-600 hover:bg-amber-500 text-black font-bold'
                  : 'bg-[#0047AB] hover:bg-[#003B91] text-white'
              )}
            >
              Mark as Delivered
            </button>
          )}

          {user?.role === 'CUSTOMER' && !canCustomerOpenIssue(order.status) && (
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-md border px-4 py-2.5 text-xs',
                isWholesalerPath
                  ? 'border-zinc-800 bg-zinc-900 text-zinc-400'
                  : 'border-[#C0C0C0] bg-white text-[#6C757D]'
              )}
            >
              <Undo2
                className={cn(
                  'h-3.5 w-3.5',
                  isWholesalerPath ? 'text-amber-400' : 'text-[#0047AB]'
                )}
              />
              After-sales requests unlock after processing/shipping.
            </div>
          )}

          {user?.role === 'CUSTOMER' &&
            order.items.some(
              (item) =>
                item.status === 'CANCELLED' &&
                ['FAILED', 'PENDING', 'PROCESSING'].includes(item.refundStatus)
            ) && (
              <div
                className={cn(
                  'inline-flex items-center gap-2 rounded-md border px-4 py-2.5 text-xs',
                  isWholesalerPath
                    ? 'border-zinc-800 bg-zinc-900 text-amber-400'
                    : 'border-[#C0C0C0] bg-white text-amber-800'
                )}
              >
                <Wallet
                  className={cn(
                    'h-3.5 w-3.5',
                    isWholesalerPath ? 'text-amber-400' : 'text-[#0047AB]'
                  )}
                />{' '}
                A cancelled prepaid item still needs refund resolution.
              </div>
            )}

          {order.paymentStatus === 'REFUND_PENDING' && (
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-md border px-4 py-2.5 text-xs',
                isWholesalerPath
                  ? 'border-zinc-800 bg-zinc-900 text-amber-400'
                  : 'border-[#C0C0C0] bg-white text-amber-800'
              )}
            >
              <Wallet
                className={cn(
                  'h-3.5 w-3.5',
                  isWholesalerPath ? 'text-amber-400' : 'text-[#0047AB]'
                )}
              />{' '}
              Refund is pending review or settlement.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
