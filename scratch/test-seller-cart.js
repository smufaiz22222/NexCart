import { prisma } from '../src/config/db.js';
import { addB2BCartItem, clearB2BCart } from '../src/controllers/b2bCartController.js';

// Mock express request & response
function createMockReqRes(userId, body, params = {}) {
  const req = {
    user: {
      userId,
      role: 'CUSTOMER',
    },
    body,
    params,
  };

  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
  };

  return { req, res };
}

async function main() {
  const buyerId = 'ee7b885c-4c02-48d1-80f6-23515128fecf'; // Baxter Silva

  // 1. Clear cart
  console.log('--- Clearing Cart ---');
  const { req: reqClear, res: resClear } = createMockReqRes(buyerId, {});
  await clearB2BCart(reqClear, resClear);
  console.log('Cart cleared. Items count:', resClear.data.items?.length);

  // 2. Add product A (Kellogg\'s Pro Coffee Beans - Daily Groceries Co.)
  console.log('\n--- Adding Product A (Daily Groceries Co.) ---');
  const { req: reqAddA, res: resAddA } = createMockReqRes(buyerId, {
    productId: '2a926a9d-a37b-429c-94fb-94b2285bd2cd',
    quantity: 5,
  });
  await addB2BCartItem(reqAddA, resAddA);
  console.log('Added Product A. Status:', resAddA.statusCode || 200);
  console.log('Cart Items:');
  resAddA.data.items.forEach((item) =>
    console.log(`- ${item.name} (Qty: ${item.quantity}) from ${item.wholesalerName}`)
  );

  // 3. Add product B (Kraft Compact Dark Chocolate - Daily Groceries Co. - same seller)
  console.log('\n--- Adding Product B (Daily Groceries Co. - Same Seller) ---');
  const { req: reqAddB, res: resAddB } = createMockReqRes(buyerId, {
    productId: '71680fc6-0e74-4bc3-87ee-f3f6f2c1777d',
    quantity: 10,
  });
  await addB2BCartItem(reqAddB, resAddB);
  console.log('Added Product B. Status:', resAddB.statusCode || 200);
  console.log('Cart Items:');
  resAddB.data.items.forEach((item) =>
    console.log(`- ${item.name} (Qty: ${item.quantity}) from ${item.wholesalerName}`)
  );

  // 4. Add product C (HarperCollins Book - Bookworm Press - different seller)
  console.log('\n--- Adding Product C (Bookworm Press - Different Seller) ---');
  const { req: reqAddC, res: resAddC } = createMockReqRes(buyerId, {
    productId: '59169345-c71f-4543-9053-5ebeefc17b65',
    quantity: 2,
  });
  await addB2BCartItem(reqAddC, resAddC);
  console.log('Added Product C. Status:', resAddC.statusCode || 200);
  console.log('Cart Items:');
  resAddC.data.items.forEach((item) =>
    console.log(`- ${item.name} (Qty: ${item.quantity}) from ${item.wholesalerName}`)
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
