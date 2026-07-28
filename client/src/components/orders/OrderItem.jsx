import { Package } from 'lucide-react';
import ProductImage from '../ProductImage';
import { cn } from '../../utils/cn';
import OrderItemInfo from './OrderItemInfo';
import { OrderItemCustomerActions, OrderItemWholesalerActions } from './OrderItemActions';
import { useOrderItemMutations } from './useOrderItemMutations';

export default function OrderItem({
  item,
  orderId,
  orderStatus,
  paymentMethod,
  user,
  isWholesalerPath,
}) {
  const {
    isPendingAction,
    handleCancelItem,
    handleRetryRefund,
    handleRequestReturn,
    handleCreateDispute,
    handleApproveReturn,
    handleRejectReturn,
    handleReceiveReturn,
    handleSettleReturnRefund,
    handleRetryReturnRefund,
  } = useOrderItemMutations({ orderId, item, paymentMethod });

  const unitPrice = Number(item.unitPriceAtPurchase ?? item.price);
  const subtotal = Number(item.subtotalAtPurchase ?? unitPrice * item.quantity);

  return (
    <li className="py-4 flex items-center first:pt-0 last:pb-0">
      <div
        className={cn(
          'h-16 w-16 rounded-md shrink-0 flex items-center justify-center overflow-hidden border',
          isWholesalerPath ? 'bg-zinc-800 border-zinc-700' : 'bg-[#EFEFEF] border-[#C0C0C0]'
        )}
      >
        <ProductImage
          src={item.product?.imageUrl}
          alt={item.product?.name}
          category={item.product?.category}
          className="h-full w-full object-contain p-1"
        />
      </div>

      <OrderItemInfo item={item} isWholesalerPath={isWholesalerPath} unitPrice={unitPrice} />

      <div className="text-right pl-4">
        <p
          className={cn(
            'text-sm font-bold font-mono',
            isWholesalerPath ? 'text-amber-400' : 'text-[#16171a]'
          )}
        >
          ₹{subtotal.toFixed(2)}
        </p>

        {user?.role === 'CUSTOMER' && (
          <OrderItemCustomerActions
            item={item}
            orderStatus={orderStatus}
            isPendingAction={isPendingAction}
            handleCancelItem={handleCancelItem}
            handleRetryRefund={handleRetryRefund}
            handleRequestReturn={handleRequestReturn}
            handleCreateDispute={handleCreateDispute}
          />
        )}

        {user?.role === 'WHOLESALER' && (
          <OrderItemWholesalerActions
            item={item}
            paymentMethod={paymentMethod}
            isWholesalerPath={isWholesalerPath}
            isPendingAction={isPendingAction}
            handleApproveReturn={handleApproveReturn}
            handleRejectReturn={handleRejectReturn}
            handleReceiveReturn={handleReceiveReturn}
            handleSettleReturnRefund={handleSettleReturnRefund}
            handleRetryReturnRefund={handleRetryReturnRefund}
          />
        )}
      </div>
    </li>
  );
}
