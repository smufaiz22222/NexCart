import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDispute,
  decorateOrderWithDisputes,
  moveDisputeToReview,
  resolveDispute,
} from './disputeService.js';

const createBaseOrder = () => ({
  id: 'order-1',
  buyerId: 'buyer-1',
  sellerId: 'seller-1',
  status: 'DELIVERED',
  paymentMethod: 'COD',
  paymentStatus: 'PAID',
  totalAmount: 200,
  createdAt: new Date('2026-06-16T10:00:00.000Z'),
  updatedAt: new Date('2026-06-16T10:00:00.000Z'),
  buyer: { id: 'buyer-1', name: 'Buyer One', email: 'buyer@example.com' },
  seller: { id: 'seller-1', businessName: 'Seller One' },
  invoice: null,
  issues: [],
  adjustments: [],
  items: [
    {
      id: 'item-1',
      orderId: 'order-1',
      productId: 'product-1',
      quantity: 1,
      price: 200,
      unitPriceAtPurchase: 200,
      subtotalAtPurchase: 200,
      status: 'ACTIVE',
      refundStatus: 'NOT_APPLICABLE',
      refundedAmount: null,
      returnStatus: 'NONE',
      returnRefundStatus: 'NONE',
      product: {
        id: 'product-1',
        name: 'Widget',
        imageUrl: null,
      },
      disputes: [],
    },
  ],
  disputes: [],
});

const clone = (value) => JSON.parse(JSON.stringify(value));

const createFakeClient = (initialOrder) => {
  const state = {
    order: clone(initialOrder),
    nextDisputeId: 1,
    nextResolutionId: 1,
    nextEventId: 1,
    nextEvidenceId: 1,
    nextNoteId: 1,
  };

  const syncItemDisputes = () => {
    state.order.items = state.order.items.map((item) => ({
      ...item,
      disputes: state.order.disputes.filter((dispute) => dispute.orderItemId === item.id),
    }));
  };

  const attachRelations = (dispute) => ({
    ...dispute,
    buyer: state.order.buyer,
    seller: state.order.seller,
    orderItem: state.order.items.find((item) => item.id === dispute.orderItemId),
    resolution: state.order.disputes.find((entry) => entry.id === dispute.id)?.resolution || null,
    evidence: dispute.evidence || [],
    internalNotes: dispute.internalNotes || [],
    events: dispute.events || [],
  });

  const getOrder = () => {
    syncItemDisputes();
    return {
      ...state.order,
      disputes: state.order.disputes.map(attachRelations),
    };
  };

  const findDispute = (disputeId) => {
    const dispute = state.order.disputes.find((entry) => entry.id === disputeId);
    return dispute ? attachRelations(dispute) : null;
  };

  const tx = {
    $queryRaw: async () => [],
    order: {
      findUnique: async ({ where }) => (where.id === state.order.id ? getOrder() : null),
    },
    dispute: {
      count: async ({ where }) =>
        state.order.disputes.filter(
          (entry) =>
            entry.buyerId === where.buyerId &&
            (!where.createdAt?.gte || new Date(entry.createdAt) >= new Date(where.createdAt.gte))
        ).length,
      findUnique: async ({ where }) => findDispute(where.id),
      create: async ({ data }) => {
        const dispute = {
          id: `dispute-${state.nextDisputeId++}`,
          orderId: data.orderId,
          orderItemId: data.orderItemId,
          buyerId: data.buyerId,
          sellerId: data.sellerId,
          status: 'OPEN',
          reason: data.reason,
          description: data.description,
          openedAt: new Date('2026-06-16T11:00:00.000Z').toISOString(),
          respondedAt: null,
          dueAt: null,
          createdByIp: data.createdByIp || null,
          createdByUserAgent: data.createdByUserAgent || null,
          createdAt: new Date('2026-06-16T11:00:00.000Z').toISOString(),
          updatedAt: new Date('2026-06-16T11:00:00.000Z').toISOString(),
          resolution: null,
          evidence: (data.evidence?.create || []).map((entry) => ({
            id: `evidence-${state.nextEvidenceId++}`,
            url: entry.url,
            createdAt: new Date('2026-06-16T11:00:00.000Z').toISOString(),
          })),
          internalNotes: [],
          events: [],
        };
        state.order.disputes.unshift(dispute);
        syncItemDisputes();
        return attachRelations(dispute);
      },
      update: async ({ where, data }) => {
        const dispute = state.order.disputes.find((entry) => entry.id === where.id);
        Object.assign(dispute, data, {
          updatedAt: new Date('2026-06-16T11:05:00.000Z').toISOString(),
        });
        return attachRelations(dispute);
      },
    },
    disputeEvent: {
      create: async ({ data }) => {
        const dispute = state.order.disputes.find((entry) => entry.id === data.disputeId);
        dispute.events.push({
          id: `event-${state.nextEventId++}`,
          type: data.type,
          notes: data.notes || null,
          performedByUserId: data.performedByUserId || null,
          performedByUser: data.performedByUserId
            ? {
                id: data.performedByUserId,
                name: data.performedByUserId === 'seller-user-1' ? 'Seller User' : 'Buyer One',
                email:
                  data.performedByUserId === 'seller-user-1'
                    ? 'seller@example.com'
                    : 'buyer@example.com',
                role: data.performedByUserId === 'seller-user-1' ? 'WHOLESALER' : 'CUSTOMER',
              }
            : null,
          createdAt: new Date('2026-06-16T11:06:00.000Z').toISOString(),
        });
        return dispute.events.at(-1);
      },
    },
    disputeResolution: {
      create: async ({ data }) => {
        const resolution = {
          id: `resolution-${state.nextResolutionId++}`,
          disputeId: data.disputeId,
          resolvedByUserId: data.resolvedByUserId,
          resolvedByRole: data.resolvedByRole,
          resolutionType: data.resolutionType,
          resolutionNotes: data.resolutionNotes || null,
          resolutionAmount: data.resolutionAmount ?? null,
          refundId: null,
          ledgerEntryId: null,
          createdAt: new Date('2026-06-16T11:07:00.000Z').toISOString(),
        };
        const dispute = state.order.disputes.find((entry) => entry.id === data.disputeId);
        dispute.resolution = resolution;
        return resolution;
      },
      updateMany: async ({ where, data }) => {
        const dispute = state.order.disputes.find((entry) => entry.resolution?.id === where.id);
        if (!dispute || (where.refundId === null && dispute.resolution.refundId !== null)) {
          return { count: 0 };
        }
        Object.assign(dispute.resolution, data);
        return { count: 1 };
      },
    },
    disputeInternalNote: {
      create: async ({ data }) => {
        const dispute = state.order.disputes.find((entry) => entry.id === data.disputeId);
        const note = {
          id: `note-${state.nextNoteId++}`,
          note: data.note,
          createdAt: new Date('2026-06-16T11:08:00.000Z').toISOString(),
          author: { id: data.authorId, name: 'Seller User', email: 'seller@example.com' },
        };
        dispute.internalNotes.push(note);
        return note;
      },
    },
  };

  return {
    state,
    client: {
      $transaction: async (callback) => callback(tx),
      order: tx.order,
      dispute: {
        count: tx.dispute.count,
        findUnique: tx.dispute.findUnique,
      },
      disputeEvent: {
        create: tx.disputeEvent.create,
      },
      disputeResolution: {
        updateMany: tx.disputeResolution.updateMany,
      },
    },
  };
};

test('createDispute trims description, deduplicates evidence, and records an OPENED event', async () => {
  const { client } = createFakeClient(createBaseOrder());

  const result = await createDispute({
    buyerId: 'buyer-1',
    orderId: 'order-1',
    itemId: 'item-1',
    reason: 'DAMAGED_ITEM',
    description: '   Damaged corner and cracked casing on arrival.   ',
    evidenceUrls: ['https://cdn.test/a.jpg', 'https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'],
    client,
  });

  assert.equal(result.dispute.reason, 'DAMAGED_ITEM');
  assert.equal(result.dispute.description, 'Damaged corner and cracked casing on arrival.');
  assert.equal(result.dispute.evidence.length, 2);
  assert.equal(result.timeline.length, 1);
  assert.equal(result.timeline[0].type, 'OPENED');
});

test('createDispute rejects items with an active return workflow', async () => {
  const order = createBaseOrder();
  order.items[0].returnStatus = 'REQUESTED';
  const { client } = createFakeClient(order);

  await assert.rejects(
    () =>
      createDispute({
        buyerId: 'buyer-1',
        orderId: 'order-1',
        itemId: 'item-1',
        reason: 'WRONG_ITEM',
        description: 'The wrong item was delivered to me yesterday.',
        client,
      }),
    /active return workflow/i
  );
});

test('moveDisputeToReview rejects stale optimistic concurrency tokens', async () => {
  const order = createBaseOrder();
  order.disputes = [
    {
      id: 'dispute-1',
      orderId: 'order-1',
      orderItemId: 'item-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      status: 'OPEN',
      reason: 'QUALITY_ISSUE',
      description: 'The material quality is much lower than described.',
      openedAt: '2026-06-16T11:00:00.000Z',
      respondedAt: null,
      dueAt: null,
      createdAt: '2026-06-16T11:00:00.000Z',
      updatedAt: '2026-06-16T11:00:00.000Z',
      evidence: [],
      internalNotes: [],
      events: [],
      resolution: null,
    },
  ];
  const { client } = createFakeClient(order);

  await assert.rejects(
    () =>
      moveDisputeToReview({
        wholesalerId: 'seller-1',
        sellerUserId: 'seller-user-1',
        orderId: 'order-1',
        itemId: 'item-1',
        disputeId: 'dispute-1',
        updatedAt: '2026-06-16T10:59:59.000Z',
        client,
      }),
    /updated elsewhere/i
  );
});

test('resolveDispute allows direct OPEN -> RESOLVED only when explicitly enabled', async () => {
  const order = createBaseOrder();
  order.disputes = [
    {
      id: 'dispute-1',
      orderId: 'order-1',
      orderItemId: 'item-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      status: 'OPEN',
      reason: 'NOT_AS_DESCRIBED',
      description: 'This item does not match the product page.',
      openedAt: '2026-06-16T11:00:00.000Z',
      respondedAt: null,
      dueAt: null,
      createdAt: '2026-06-16T11:00:00.000Z',
      updatedAt: '2026-06-16T11:00:00.000Z',
      evidence: [],
      internalNotes: [],
      events: [],
      resolution: null,
    },
  ];
  const { client } = createFakeClient(order);

  await assert.rejects(
    () =>
      resolveDispute({
        wholesalerId: 'seller-1',
        sellerUserId: 'seller-user-1',
        orderId: 'order-1',
        itemId: 'item-1',
        disputeId: 'dispute-1',
        updatedAt: '2026-06-16T11:00:00.000Z',
        resolutionType: 'REJECT',
        client,
      }),
    /allowDirectResolution=true/i
  );

  const result = await resolveDispute({
    wholesalerId: 'seller-1',
    sellerUserId: 'seller-user-1',
    orderId: 'order-1',
    itemId: 'item-1',
    disputeId: 'dispute-1',
    updatedAt: '2026-06-16T11:00:00.000Z',
    resolutionType: 'REJECT',
    resolutionNotes: 'Photos do not support the claim.',
    allowDirectResolution: true,
    client,
  });

  assert.equal(result.dispute.status, 'RESOLVED');
  assert.equal(result.latestResolution.resolutionType, 'REJECT');
  assert.deepEqual(
    result.timeline.map((entry) => entry.type),
    ['RESOLUTION_CREATED', 'REJECTED']
  );
});

test('decorateOrderWithDisputes hides seller-only notes from customers', () => {
  const order = createBaseOrder();
  order.disputes = [
    {
      id: 'dispute-1',
      orderId: 'order-1',
      orderItemId: 'item-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      status: 'UNDER_REVIEW',
      reason: 'DEFECTIVE_PRODUCT',
      description: 'The switch stopped working.',
      openedAt: '2026-06-16T11:00:00.000Z',
      respondedAt: '2026-06-16T11:10:00.000Z',
      dueAt: null,
      createdAt: '2026-06-16T11:00:00.000Z',
      updatedAt: '2026-06-16T11:10:00.000Z',
      resolution: null,
      evidence: [],
      internalNotes: [
        {
          id: 'note-1',
          note: 'Warehouse confirmed outer box damage.',
          createdAt: '2026-06-16T11:11:00.000Z',
          author: { id: 'seller-user-1', name: 'Seller User', email: 'seller@example.com' },
        },
      ],
      events: [],
    },
  ];

  const customerView = decorateOrderWithDisputes(order, 'CUSTOMER');
  const sellerView = decorateOrderWithDisputes(order, 'WHOLESALER');

  assert.equal(customerView.disputes[0].internalNotes.length, 0);
  assert.equal(sellerView.disputes[0].internalNotes.length, 1);
});
