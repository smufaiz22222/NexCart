# BACKLOG-011: Write N+1 Performance Bottle-neck in Transactional Checkout

## Issue Description
During order checkout, the database transaction performed sequential `tx.inventoryLog.create` and `tx.product.update` queries in a loop for each item in the cart. For checkouts containing many items, this serial execution blocked database connections, increasing lock hold times and degrading performance under high concurrency.

---

## Resolution

We optimized checkout database writes inside `createOrdersFromGroupedData` (`src/controllers/orderController.js`):
1. **Parallel Stock Decrements**: Replaced the sequential updates of product stocks in the loop with a parallel execution using `Promise.all`. If any update fails (e.g. if a product goes out of stock), the transaction correctly rejects and rolls back.
2. **Bulk Inventory Logging**: Gathered all inventory logs into an array and inserted them in bulk using `tx.inventoryLog.createMany` in a single query after the loop, replacing N database round-trips with one.

To prevent testing errors with mocked transaction contexts:
- Updated the transaction mock in `src/routes/checkoutRoutes.test.js` to implement `createMany` for `inventoryLog`.

---

## Files Changed

### 1. [orderController.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/controllers/orderController.js)
- Refactored `createOrdersFromGroupedData` to execute concurrent stock updates and a bulk inventory log insertion.

### 2. [checkoutRoutes.test.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/routes/checkoutRoutes.test.js)
- Added `createMany` to the mocked `inventoryLog` transaction handler helper.

---

## Verification
- Checked JavaScript syntax using `node --check`.
- Ran unit/integration tests with `pnpm run test`, executing **47/47 passing tests** successfully.
