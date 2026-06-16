import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalyticsOverview } from './analyticsOverviewService.js';

const buildProduct = (overrides = {}) => ({
  id: 'product-1',
  name: 'Product One',
  sku: 'SKU-1',
  price: 100,
  costPrice: 60,
  currentStock: 10,
  ...overrides,
});

const buildOrderItem = (overrides = {}) => ({
  id: 'item-1',
  productId: 'product-1',
  quantity: 3,
  returnedQuantity: 0,
  status: 'ACTIVE',
  price: 100,
  unitPriceAtPurchase: 100,
  product: { id: 'product-1', name: 'Product One', sku: 'SKU-1', costPrice: 60, currentStock: 10 },
  ...overrides,
});

const buildOrder = (overrides = {}) => ({
  id: 'order-1',
  buyerId: 'buyer-1',
  createdAt: '2026-06-01T10:00:00.000Z',
  buyer: { name: 'Buyer One', email: 'buyer1@example.com' },
  items: [buildOrderItem()],
  ...overrides,
});

test('buildAnalyticsOverview handles profit and returns using net sales only', () => {
  const result = buildAnalyticsOverview({
    products: [
      buildProduct(),
      buildProduct({
        id: 'product-2',
        name: 'Product Two',
        sku: 'SKU-2',
        price: 50,
        costPrice: 20,
        currentStock: 8,
      }),
    ],
    orders: [
      buildOrder({
        items: [
          buildOrderItem({
            quantity: 5,
            returnedQuantity: 2,
            unitPriceAtPurchase: 120,
            product: {
              id: 'product-1',
              name: 'Product One',
              sku: 'SKU-1',
              costPrice: 70,
              currentStock: 10,
            },
          }),
          buildOrderItem({
            id: 'item-2',
            productId: 'product-2',
            status: 'CANCELLED',
            quantity: 4,
            unitPriceAtPurchase: 50,
            product: {
              id: 'product-2',
              name: 'Product Two',
              sku: 'SKU-2',
              costPrice: 20,
              currentStock: 8,
            },
          }),
        ],
      }),
    ],
    now: new Date('2026-06-15T00:00:00.000Z'),
  });

  assert.equal(result.headline.revenue, 360);
  assert.equal(result.headline.profit, 150);
  assert.equal(result.headline.profitMargin, 0.4167);
  assert.equal(result.headline.avgOrderValue, 360);
  assert.equal(result.salesTrend[0].orders, 1);
});

test('buildAnalyticsOverview buckets trend data by daily monthly and yearly timeframes', () => {
  const products = [buildProduct()];
  const orders = [
    buildOrder({ id: 'order-1', createdAt: '2026-06-01T10:00:00.000Z' }),
    buildOrder({
      id: 'order-2',
      createdAt: '2026-06-02T10:00:00.000Z',
      buyerId: 'buyer-2',
      buyer: { name: 'Buyer Two', email: 'buyer2@example.com' },
    }),
    buildOrder({
      id: 'order-3',
      createdAt: '2025-05-02T10:00:00.000Z',
      buyerId: 'buyer-3',
      buyer: { name: 'Buyer Three', email: 'buyer3@example.com' },
    }),
  ];

  const daily = buildAnalyticsOverview({
    products,
    orders,
    timeframe: 'daily',
    now: new Date('2026-06-15T00:00:00.000Z'),
  });
  const monthly = buildAnalyticsOverview({
    products,
    orders,
    timeframe: 'monthly',
    now: new Date('2026-06-15T00:00:00.000Z'),
  });
  const yearly = buildAnalyticsOverview({
    products,
    orders,
    timeframe: 'yearly',
    now: new Date('2026-06-15T00:00:00.000Z'),
  });

  assert.equal(daily.salesTrend.length, 3);
  assert.equal(monthly.salesTrend.length, 2);
  assert.equal(yearly.salesTrend.length, 2);
  assert.equal(yearly.salesTrend[1].period, '2026');
});

test('buildAnalyticsOverview ranks top skus and detects slow-moving inventory', () => {
  const result = buildAnalyticsOverview({
    products: [
      buildProduct({ id: 'fast', name: 'Fast Seller', sku: 'FAST', currentStock: 3 }),
      buildProduct({ id: 'slow', name: 'Slow Seller', sku: 'SLOW', price: 200, currentStock: 5 }),
      buildProduct({ id: 'idle', name: 'Idle Seller', sku: 'IDLE', price: 250, currentStock: 6 }),
      buildProduct({ id: 'never', name: 'Never Sold', sku: 'NEVER', price: 300, currentStock: 4 }),
    ],
    orders: [
      buildOrder({
        createdAt: '2026-06-10T10:00:00.000Z',
        items: [
          buildOrderItem({
            id: 'fast-item',
            productId: 'fast',
            quantity: 5,
            unitPriceAtPurchase: 100,
            product: {
              id: 'fast',
              name: 'Fast Seller',
              sku: 'FAST',
              costPrice: 60,
              currentStock: 3,
            },
          }),
          buildOrderItem({
            id: 'slow-item',
            productId: 'slow',
            quantity: 1,
            unitPriceAtPurchase: 200,
            product: {
              id: 'slow',
              name: 'Slow Seller',
              sku: 'SLOW',
              costPrice: 60,
              currentStock: 5,
            },
          }),
        ],
      }),
      buildOrder({
        id: 'older-order',
        buyerId: 'buyer-2',
        buyer: { name: 'Buyer Two', email: 'buyer2@example.com' },
        createdAt: '2026-04-01T10:00:00.000Z',
        items: [
          buildOrderItem({
            id: 'idle-item',
            productId: 'idle',
            quantity: 2,
            unitPriceAtPurchase: 250,
            product: {
              id: 'idle',
              name: 'Idle Seller',
              sku: 'IDLE',
              costPrice: 60,
              currentStock: 6,
            },
          }),
        ],
      }),
    ],
    now: new Date('2026-06-15T00:00:00.000Z'),
  });

  assert.equal(result.topSkus[0].productId, 'fast');
  assert.deepEqual(
    result.slowMovingInventory.map((item) => item.productId),
    ['idle', 'never']
  );
  assert.equal(result.headline.slowMovingSkuCount, 2);
});

test('buildAnalyticsOverview calculates customer value and churn risk heuristics', () => {
  const result = buildAnalyticsOverview({
    products: [buildProduct()],
    orders: [
      buildOrder({
        id: 'recent-repeat-1',
        buyerId: 'buyer-repeat',
        buyer: { name: 'Repeat Buyer', email: 'repeat@example.com' },
        createdAt: '2026-05-20T10:00:00.000Z',
      }),
      buildOrder({
        id: 'recent-repeat-2',
        buyerId: 'buyer-repeat',
        buyer: { name: 'Repeat Buyer', email: 'repeat@example.com' },
        createdAt: '2026-06-10T10:00:00.000Z',
      }),
      buildOrder({
        id: 'medium-risk-1',
        buyerId: 'buyer-medium',
        buyer: { name: 'Medium Buyer', email: 'medium@example.com' },
        createdAt: '2026-04-25T10:00:00.000Z',
      }),
      buildOrder({
        id: 'medium-risk-2',
        buyerId: 'buyer-medium',
        buyer: { name: 'Medium Buyer', email: 'medium@example.com' },
        createdAt: '2026-04-28T10:00:00.000Z',
      }),
      buildOrder({
        id: 'high-risk-1',
        buyerId: 'buyer-high',
        buyer: { name: 'High Buyer', email: 'high@example.com' },
        createdAt: '2026-02-01T10:00:00.000Z',
      }),
      buildOrder({
        id: 'high-risk-2',
        buyerId: 'buyer-high',
        buyer: { name: 'High Buyer', email: 'high@example.com' },
        createdAt: '2026-02-10T10:00:00.000Z',
      }),
      buildOrder({
        id: 'one-timer-medium',
        buyerId: 'buyer-once',
        buyer: { name: 'One Timer', email: 'once@example.com' },
        createdAt: '2026-05-01T10:00:00.000Z',
      }),
      buildOrder({
        id: 'one-timer-recent',
        buyerId: 'buyer-fresh',
        buyer: { name: 'Fresh Buyer', email: 'fresh@example.com' },
        createdAt: '2026-06-05T10:00:00.000Z',
      }),
    ],
    now: new Date('2026-06-15T00:00:00.000Z'),
  });

  assert.equal(result.customerInsights.totalCustomers, 5);
  assert.equal(result.customerInsights.repeatCustomers, 3);
  assert.equal(result.customerInsights.repeatCustomerRate, 0.6);
  assert.equal(result.customerInsights.estimatedClv, result.headline.estimatedClv);
  assert.equal(result.churnRisk.highRiskCount, 1);
  assert.equal(result.churnRisk.mediumRiskCount, 2);
  assert.deepEqual(
    result.churnRisk.customers.map((customer) => `${customer.customerId}:${customer.riskLevel}`),
    ['buyer-high:high', 'buyer-medium:medium', 'buyer-once:medium']
  );
});
