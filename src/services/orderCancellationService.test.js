import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cancelOrderItemForCustomer,
  processCancelledItemRefund,
  retryOrderItemRefundForCustomer,
} from './orderCancellationService.js';

test('cancelOrderItemForCustomer returns existing state when item is already cancelled', async () => {
  const order = {
    id: 'order-1',
    buyerId: 'buyer-1',
    paymentMethod: 'PREPAID',
    paymentStatus: 'REFUND_PENDING',
    items: [
      {
        id: 'item-1',
        status: 'CANCELLED',
        refundStatus: 'FAILED',
        refundFailureReason: 'Gateway timeout',
      },
    ],
    issues: [],
  };

  const fakeClient = {
    $transaction: async (callback) =>
      callback({
        $queryRaw: async () => [],
        orderItem: {
          findUnique: async () => ({
            id: 'item-1',
            orderId: 'order-1',
            productId: 'product-1',
            quantity: 1,
            subtotalAtPurchase: 999,
            status: 'CANCELLED',
            order: { id: 'order-1' },
            product: { id: 'product-1' },
          }),
        },
        order: {
          findUnique: async () => ({
            id: 'order-1',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
            status: 'PENDING',
            paymentMethod: 'PREPAID',
            paymentStatus: 'REFUND_PENDING',
            items: [
              {
                id: 'item-1',
                status: 'CANCELLED',
                subtotalAtPurchase: 999,
                refundStatus: 'FAILED',
                refundFailureReason: 'Gateway timeout',
              },
            ],
            invoice: null,
            buyer: { id: 'buyer-1', name: 'Buyer', email: 'buyer@example.com' },
            seller: { id: 'seller-1', businessName: 'Seller One' },
            issues: [],
          }),
          findUniqueOrThrow: async () => order,
        },
      }),
    order: {
      findUnique: async () => order,
    },
  };

  const result = await cancelOrderItemForCustomer({
    buyerId: 'buyer-1',
    orderId: 'order-1',
    itemId: 'item-1',
    client: fakeClient,
  });

  assert.equal(result.alreadyCancelled, true);
  assert.equal(result.item.refundStatus, 'FAILED');
});

test('processCancelledItemRefund is a no-op for already refunded items', async () => {
  const fakeClient = {
    order: {
      findUnique: async () => ({
        id: 'order-1',
        buyerId: 'buyer-1',
        paymentMethod: 'PREPAID',
        paymentStatus: 'REFUNDED',
        razorpayPaymentId: 'pay_123',
        items: [
          {
            id: 'item-1',
            status: 'CANCELLED',
            refundStatus: 'REFUNDED',
            refundReference: 'rfnd_123',
          },
        ],
        invoice: null,
        issues: [],
      }),
    },
  };

  const result = await processCancelledItemRefund({
    orderId: 'order-1',
    itemId: 'item-1',
    client: fakeClient,
  });

  assert.equal(result.item.refundStatus, 'REFUNDED');
  assert.equal(result.item.refundReference, 'rfnd_123');
});

test('retryOrderItemRefundForCustomer rejects unauthorized access', async () => {
  const fakeClient = {
    order: {
      findUnique: async () => ({
        id: 'order-1',
        buyerId: 'buyer-1',
        paymentMethod: 'PREPAID',
        items: [
          {
            id: 'item-1',
            status: 'CANCELLED',
            refundStatus: 'FAILED',
          },
        ],
        invoice: null,
        issues: [],
      }),
    },
  };

  await assert.rejects(
    () =>
      retryOrderItemRefundForCustomer({
        buyerId: 'buyer-2',
        orderId: 'order-1',
        itemId: 'item-1',
        client: fakeClient,
      }),
    /Not authorized/
  );
});

test('retryOrderItemRefundForCustomer does not resend refunds that are still pending', async () => {
  let attemptedRetry = false;
  const fakeClient = {
    order: {
      findUnique: async () => ({
        id: 'order-1',
        buyerId: 'buyer-1',
        paymentMethod: 'PREPAID',
        items: [
          {
            id: 'item-1',
            status: 'CANCELLED',
            refundStatus: 'PENDING',
          },
        ],
        invoice: null,
        issues: [],
      }),
    },
  };

  const result = await retryOrderItemRefundForCustomer({
    buyerId: 'buyer-1',
    orderId: 'order-1',
    itemId: 'item-1',
    client: new Proxy(fakeClient, {
      get(target, prop, receiver) {
        if (prop === 'orderItem') {
          attemptedRetry = true;
        }
        return Reflect.get(target, prop, receiver);
      },
    }),
  });

  assert.equal(attemptedRetry, false);
  assert.equal(
    result.message,
    'Refund is already pending. Please wait for it to settle before retrying.'
  );
});
