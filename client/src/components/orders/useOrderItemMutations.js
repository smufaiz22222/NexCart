import { useState } from 'react';
import { toast } from 'sonner';
import {
  useCancelOrderItem,
  useRetryRefund,
  useRequestReturn,
  useApproveReturn,
  useRejectReturn,
  useReceiveReturn,
  useRetryReturnRefund,
  useCreateDispute,
  useSettleReturnRefund,
} from '../../api/queries';

export const RETURN_REASON_OPTIONS = [
  'WRONG_ITEM',
  'DAMAGED',
  'DEFECTIVE',
  'CHANGED_MIND',
  'MISSING_PARTS',
  'OTHER',
];

export const DISPUTE_REASON_OPTIONS = [
  'DAMAGED_ITEM',
  'WRONG_ITEM',
  'MISSING_PARTS',
  'DEFECTIVE_PRODUCT',
  'QUALITY_ISSUE',
  'NOT_AS_DESCRIBED',
  'OTHER',
];

export function useOrderItemMutations({ orderId, item, paymentMethod }) {
  const [isPendingAction, setIsPendingAction] = useState(false);

  const cancelOrderItemMutation = useCancelOrderItem();
  const retryRefundMutation = useRetryRefund();
  const requestReturnMutation = useRequestReturn();
  const approveReturnMutation = useApproveReturn();
  const rejectReturnMutation = useRejectReturn();
  const receiveReturnMutation = useReceiveReturn();
  const retryReturnRefundMutation = useRetryReturnRefund();
  const createDisputeMutation = useCreateDispute();
  const settleReturnRefundMutation = useSettleReturnRefund();

  const handleCancelItem = () => {
    setIsPendingAction(true);
    cancelOrderItemMutation.mutate(
      { orderId, itemId: item.id },
      {
        onSuccess: () => {
          toast.success('Item cancelled successfully');
        },
        onError: (err) => {
          console.error('Failed to cancel order item:', err);
          toast.error(err.response?.data?.error || 'Failed to cancel the item');
        },
        onSettled: () => {
          setIsPendingAction(false);
        },
      }
    );
  };

  const handleRetryRefund = () => {
    setIsPendingAction(true);
    retryRefundMutation.mutate(
      { orderId, itemId: item.id },
      {
        onSuccess: () => {
          toast.success('Refund retry initiated');
        },
        onError: (err) => {
          console.error('Failed to retry refund:', err);
          toast.error(err.response?.data?.error || 'Failed to retry refund');
        },
        onSettled: () => {
          setIsPendingAction(false);
        },
      }
    );
  };

  const handleRequestReturn = () => {
    const reasonInput =
      window.prompt(`Return reason (${RETURN_REASON_OPTIONS.join(', ')})`, 'DAMAGED') || '';
    const normalizedReason = reasonInput.trim().toUpperCase().replaceAll(' ', '_');
    if (!RETURN_REASON_OPTIONS.includes(normalizedReason)) {
      toast.warning('Please enter a valid return reason.');
      return;
    }

    const quantityInput =
      window.prompt('Return quantity', String(item.quantity)) || String(item.quantity);
    const parsedQuantity = Number.parseInt(quantityInput, 10);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > item.quantity) {
      toast.warning('Please enter a valid return quantity.');
      return;
    }

    const notes = window.prompt('Optional note for the seller', '') || '';

    let bankAccountNumber = null;
    let bankIfsc = null;
    let bankAccountName = null;

    if (paymentMethod === 'COD') {
      const wantBankRefund = window.confirm(
        'Would you like to receive your refund via bank transfer? Click OK to provide bank details, or Cancel to arrange offline cash pickup.'
      );
      if (wantBankRefund) {
        bankAccountNumber = window.prompt('Enter your Bank Account Number:') || null;
        bankIfsc = window.prompt('Enter Bank IFSC Code:') || null;
        bankAccountName = window.prompt('Enter Account Holder Name:') || null;

        if (bankAccountNumber && !bankAccountNumber.trim()) bankAccountNumber = null;
        if (bankIfsc && !bankIfsc.trim()) bankIfsc = null;
        if (bankAccountName && !bankAccountName.trim()) bankAccountName = null;
      }
    }

    setIsPendingAction(true);
    requestReturnMutation.mutate(
      {
        orderId,
        itemId: item.id,
        reason: normalizedReason,
        notes,
        quantity: parsedQuantity,
        bankAccountNumber,
        bankIfsc,
        bankAccountName,
      },
      {
        onSuccess: () => {
          toast.success('Return requested successfully');
        },
        onError: (err) => {
          console.error('Failed to request return:', err);
          toast.error(err.response?.data?.error || 'Failed to request the return');
        },
        onSettled: () => {
          setIsPendingAction(false);
        },
      }
    );
  };

  const handleCreateDispute = () => {
    const reasonInput =
      window.prompt(`Dispute reason (${DISPUTE_REASON_OPTIONS.join(', ')})`, 'DAMAGED_ITEM') || '';
    const normalizedReason = reasonInput.trim().toUpperCase().replaceAll(' ', '_');
    if (!DISPUTE_REASON_OPTIONS.includes(normalizedReason)) {
      toast.warning('Please enter a valid dispute reason.');
      return;
    }

    const description =
      window.prompt(
        'Describe the issue in detail',
        'Explain what went wrong, what you expected, and why you need seller review.'
      ) || '';
    if (!description.trim()) {
      toast.warning('A dispute description is required.');
      return;
    }

    const evidenceInput = window.prompt('Optional evidence URLs, separated by commas', '') || '';
    const evidenceUrls = evidenceInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    setIsPendingAction(true);
    createDisputeMutation.mutate(
      {
        orderId,
        itemId: item.id,
        reason: normalizedReason,
        description,
        evidenceUrls,
      },
      {
        onSuccess: () => {
          toast.success('Dispute opened successfully');
        },
        onError: (err) => {
          console.error('Failed to create dispute:', err);
          toast.error(err.response?.data?.error || 'Failed to create dispute');
        },
        onSettled: () => {
          setIsPendingAction(false);
        },
      }
    );
  };

  const handleApproveReturn = () => {
    setIsPendingAction(true);
    approveReturnMutation.mutate(
      { orderId, itemId: item.id },
      {
        onSuccess: () => {
          toast.success('Return approved');
        },
        onError: (err) => {
          console.error('Failed to approve return:', err);
          toast.error(err.response?.data?.error || 'Failed to approve the return');
        },
        onSettled: () => {
          setIsPendingAction(false);
        },
      }
    );
  };

  const handleRejectReturn = () => {
    const rejectionReason = window.prompt('Reason for rejecting this return', '') || '';
    if (!rejectionReason.trim()) {
      toast.warning('Rejection reason is required.');
      return;
    }

    setIsPendingAction(true);
    rejectReturnMutation.mutate(
      { orderId, itemId: item.id, rejectionReason },
      {
        onSuccess: () => {
          toast.success('Return rejected');
        },
        onError: (err) => {
          console.error('Failed to reject return:', err);
          toast.error(err.response?.data?.error || 'Failed to reject the return');
        },
        onSettled: () => {
          setIsPendingAction(false);
        },
      }
    );
  };

  const handleReceiveReturn = () => {
    setIsPendingAction(true);
    receiveReturnMutation.mutate(
      { orderId, itemId: item.id },
      {
        onSuccess: () => {
          toast.success('Return received');
        },
        onError: (err) => {
          console.error('Failed to receive return:', err);
          toast.error(err.response?.data?.error || 'Failed to confirm return receipt');
        },
        onSettled: () => {
          setIsPendingAction(false);
        },
      }
    );
  };

  const handleSettleReturnRefund = () => {
    const refundMethodInput =
      window.prompt('Settle refund method (CASH, BANK_TRANSFER, UPI)', 'CASH') || '';
    const normalizedMethod = refundMethodInput.trim().toUpperCase().replace(' ', '_');
    if (!['CASH', 'BANK_TRANSFER', 'UPI'].includes(normalizedMethod)) {
      toast.warning('Please enter a valid refund method: CASH, BANK_TRANSFER, or UPI.');
      return;
    }

    setIsPendingAction(true);
    settleReturnRefundMutation.mutate(
      {
        orderId,
        itemId: item.id,
        refundMethod: normalizedMethod,
      },
      {
        onSuccess: () => {
          toast.success('Refund settled successfully');
        },
        onError: (err) => {
          console.error('Failed to settle return refund:', err);
          toast.error(err.response?.data?.error || 'Failed to settle return refund');
        },
        onSettled: () => {
          setIsPendingAction(false);
        },
      }
    );
  };

  const handleRetryReturnRefund = () => {
    setIsPendingAction(true);
    retryReturnRefundMutation.mutate(
      { orderId, itemId: item.id },
      {
        onSuccess: () => {
          toast.success('Return refund retried');
        },
        onError: (err) => {
          console.error('Failed to retry return refund:', err);
          toast.error(err.response?.data?.error || 'Failed to retry return refund');
        },
        onSettled: () => {
          setIsPendingAction(false);
        },
      }
    );
  };

  return {
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
  };
}
