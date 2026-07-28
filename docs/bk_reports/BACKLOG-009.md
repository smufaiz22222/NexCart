# BACKLOG-009: Heavy On-the-Fly Aggregations and Denormalization

## Issue Description

1. **Running balance calculation bottleneck**: The running credit balance of a B2B customer was calculated on-the-fly inside `getCustomerLedger` and other endpoints by querying and summing all corresponding ledger entries in-memory. As the transactional history grew, this calculation degraded performance and connection pools.
2. **Unnormalized geographical address details**: Shipping address details were stored as a single unnormalized flat string in the `Order` model. This prevented structured querying, regional analysis, and grouping by city or state.

---

## Resolution

### 1. Cached balance on trade credit limit relation

- Added a `balance` Decimal column to the `WholesalerCreditLimit` model in `schema.prisma`.
- Implemented a Prisma query extension in `src/config/db.js` using `Prisma.defineExtension` to intercept write operations on `LedgerEntry` (`create`, `createMany`, `update`, `updateMany`, `delete`, `deleteMany`, `upsert`). When a ledger entry is created or updated, the customer's balance is automatically recalculated using a database aggregation and stored in `WholesalerCreditLimit.balance` within the same transaction.
- Refactored `getCustomerLedger`, `getMyLedger`, `getWholesalerBuyers`, and checkout credit checks to fetch the pre-computed balance.

### 2. Normalized address fields on Order model

- Added `shippingStreet`, `shippingCity`, `shippingState`, and `shippingPostalCode` to the `Order` model, with index mappings on `shippingCity` and `shippingState` for fast regional query grouping.
- Modified checkout and prepaid order creation/verification flows to extract, pass down, and write structured address fields.

---

## Files Changed

### 1. [schema.prisma](file:///c:/Users/smufa/Desktop/NexCart_updated/prisma/schema.prisma)

- Added `balance` to `WholesalerCreditLimit`.
- Added address fields and indices to `Order`.

### 2. [db.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/config/db.js)

- Registered a Prisma query extension on `LedgerEntry` to update `balance` in `WholesalerCreditLimit`.

### 3. [ledgerController.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/controllers/ledgerController.js)

- Refactored `getCustomerLedger` and `getMyLedger` to load pre-calculated balances.

### 4. [b2bController.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/controllers/b2bController.js)

- Refactored `getWholesalerBuyers` to fetch cached credit limit balance directly.

### 5. [orderController.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/controllers/orderController.js)

- Refactored checkout flows to store normalized address fields and check credit limits using the cached balance.

---

## Verification

- Validated Prisma schema syntax using `npx prisma validate`.
- Pushed updates and regenerated Prisma Client with `npx prisma db push` and `npx prisma generate`.
- Ran unit/integration tests with `pnpm run test`, executing **47/47 passing tests** successfully.
