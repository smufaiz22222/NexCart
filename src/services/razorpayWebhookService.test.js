import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { handleRazorpayWebhook } from './razorpayWebhookService.js';

const signPayload = (payload, secret) =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

test('handleRazorpayWebhook marks a matched cancelled item as refunded from a refund.processed event', async () => {
  const secret = 'webhook-secret';
  const state = {
    order: {
      id: 'order-1',
      paymentMethod: 'PREPAID',
      paymentStatus: 'REFUND_PENDING',
      items: [
        {
          id: 'item-1',
          status: 'CANCELLED',
          refundStatus: 'PROCESSING',
          refundReference: null,
          refundFailureReason: null,
          subtotalAtPurchase: 999,
          refundedAmount: null,
        },
      ],
    },
  };

  const fakeClient = {
    order: {
      findUnique: async ({ where }) => (where.id === state.order.id ? state.order : null),
      findFirst: async () => null,
      findMany: async () => [],
      update: async ({ data }) => {
        state.order = { ...state.order, ...data };
        return state.order;
      },
      updateMany: async () => ({ count: 0 }),
    },
    orderItem: {
      update: async ({ where, data }) => {
        state.order.items = state.order.items.map((item) =>
          item.id === where.id ? { ...item, ...data } : item
        );
        return state.order.items.find((item) => item.id === where.id);
      },
    },
    prepaidCheckoutSession: {
      updateMany: async () => ({ count: 0 }),
    },
  };

  const payload = JSON.stringify({
    event: 'refund.processed',
    payload: {
      refund: {
        entity: {
          id: 'rfnd_123',
          payment_id: 'pay_123',
          amount: 999,
          status: 'processed',
          created_at: 1718500000,
          processed_at: 1718500100,
          notes: {
            orderId: 'order-1',
            orderItemId: 'item-1',
          },
        },
      },
    },
  });

  const result = await handleRazorpayWebhook({
    rawBody: Buffer.from(payload, 'utf8'),
    signature: signPayload(payload, secret),
    secret,
    client: fakeClient,
  });

  assert.equal(result.handled, true);
  assert.equal(result.refundStatus, 'REFUNDED');
  assert.equal(state.order.items[0].refundStatus, 'REFUNDED');
  assert.equal(state.order.items[0].refundReference, 'rfnd_123');
  assert.equal(state.order.items[0].refundedAmount, 9.99);
  assert.equal(state.order.paymentStatus, 'REFUNDED');
});

test('handleRazorpayWebhook rejects an invalid signature', async () => {
  await assert.rejects(
    () =>
      handleRazorpayWebhook({
        rawBody: Buffer.from('{"event":"refund.created"}', 'utf8'),
        signature: 'bad-signature',
        secret: 'webhook-secret',
        client: {
          order: {},
          orderItem: {},
          prepaidCheckoutSession: {},
        },
      }),
    /Invalid Razorpay webhook signature/
  );
});
