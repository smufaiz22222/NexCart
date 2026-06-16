# Marketplace Order Accounting Automation Report

## Overview

This report documents the production-focused accounting work completed for marketplace orders in NexCart. The implementation now covers two related areas:

1. COD wholesaler ledger automation on delivery
2. Dedicated post-delivery return handling for inventory, ledger, and refunds

The goal of these changes was to remove manual wholesaler intervention from the normal marketplace order lifecycle while preserving auditability, correctness under concurrency, and operational flexibility for exceptional cases.

---

## Objectives Delivered

### 1. COD Delivery Auto-Settlement

For eligible COD orders, marking an order as `DELIVERED` now:

- updates the order status
- marks the order payment status as `PAID`
- creates exactly one positive ledger settlement entry
- uses persisted accounting totals from the database
- runs atomically in a single transaction
- remains safe under retry and concurrent requests

This removes the need for wholesalers to manually record a normal marketplace COD payment in the ledger.

### 2. Dedicated Delivered Return Workflow

Delivered-item returns are now handled through a dedicated return lifecycle that is separate from cancellation:

- `DELIVERED -> REQUESTED -> APPROVED/REJECTED -> RECEIVED -> RETURN_COMPLETED`

The workflow now supports:

- customer return requests
- wholesaler approval and rejection
- receipt confirmation
- inventory restoration
- accounting adjustments
- ledger reversals
- prepaid refund initiation and retry
- COD settlement reversal logic

---

## Files Changed

### Backend

- [src/controllers/orderController.js](../src/controllers/orderController.js)
- [src/services/orderReturnService.js](../src/services/orderReturnService.js)
- [src/routes/orderRoutes.js](../src/routes/orderRoutes.js)
- [src/routes/statsRoutes.js](../src/routes/statsRoutes.js)
- [src/controllers/superAdminController.js](../src/controllers/superAdminController.js)

### Database

- [prisma/schema.prisma](../prisma/schema.prisma)
- [prisma/migrations/20260616201500_dedicated_delivered_returns/migration.sql](../prisma/migrations/20260616201500_dedicated_delivered_returns/migration.sql)

### Frontend

- [client/src/pages/Orders.jsx](../client/src/pages/Orders.jsx)
- [client/src/pages/Ledger.jsx](../client/src/pages/Ledger.jsx)

### Tests

- [src/routes/orderReturns.integration.test.js](../src/routes/orderReturns.integration.test.js)

---

## COD Ledger Automation

### Behavior

`PUT /api/orders/:id/status` was extended so that when a wholesaler marks an order `DELIVERED`, the backend checks whether the order should be auto-settled.

Eligibility requires:

- correct wholesaler ownership
- target status is `DELIVERED`
- order is not cancelled
- payment method is `COD`
- payment status is not already `PAID`
- the order still has active non-cancelled items

### Amount Source of Truth

The settlement amount is pulled from persisted accounting values only:

- prefer `invoice.amount`
- otherwise fall back to `order.totalAmount`

No client-provided amount is used for the settlement row.

### Concurrency and Idempotency

The delivery flow now performs:

- delivery status update
- payment status update
- auto-payment ledger entry creation

inside a single transaction.

The ledger row uses a deterministic idempotency key:

`order-auto-payment:<orderId>`

This is enforced by a database unique constraint on `LedgerEntry.idempotencyKey`. If a concurrent or repeated delivery request races with another request, duplicate-create attempts are treated as already settled instead of failing the visible order update.

### Ledger Modeling

`LedgerEntry` now supports:

- `orderId`
- `source`
- `idempotencyKey`

This allows system-generated entries to be tied to a specific order while preserving manual ledger entries for exceptional real-world adjustments.

### UI Effect

The wholesaler Orders page now refreshes from the backend response after a status update, so `COD · PAID` appears immediately after a successful delivery settlement.

The Ledger page now explicitly explains that:

- marketplace COD payments are recorded automatically on delivery
- manual payment entry is for exceptional offline adjustments only

---

## Dedicated Delivered Returns

### Data Model

`OrderItem` was extended with dedicated return fields, including:

- `returnStatus`
- `returnRefundStatus`
- `returnReason`
- `customerReturnNotes`
- `rejectionReason`
- `decisionBy`
- `returnedQuantity`
- `refundAmountSnapshot`
- `inventoryRestored`
- `refundAttemptCount`
- `gatewayRefundId`
- `gatewayResponse`
- return lifecycle timestamps
- `returnEligibleUntil`

`Order` now also supports `RETURN_COMPLETED` and connects to `OrderAdjustment` and `LedgerEntry`.

### Accounting

Original order and invoice history remains intact for returns.

Instead of rewriting the original sale history for returns, the implementation now creates `OrderAdjustment` rows for return accounting. This allows the system to derive:

- original amount
- cancelled amount
- returned amount
- payable amount

This is exposed in the decorated order response as `financials`.

### Inventory

Inventory is restored only when the wholesaler confirms that the returned item was physically received.

Receipt confirmation creates exactly once:

- product stock increment
- one `InventoryLog` row with `CUSTOMER_RETURN`
- one `OrderAdjustment`
- one or two ledger reversal rows depending on payment state

Idempotency is protected with deterministic reference keys and unique constraints.

### Ledger and Refund Effects

On receipt confirmation:

- a return charge reversal entry is created with `source = CUSTOMER_RETURN`
- if the order had already been financially settled, a second settlement-adjustment entry is created

For prepaid:

- the second reversal entry uses `source = RETURN_REFUND`
- refund processing begins after receipt
- failed refund attempts do not duplicate stock or accounting side effects
- retries only update refund metadata and final refund state

For COD:

- the second reversal entry uses `source = RETURN_ADJUSTMENT`
- previously auto-settled delivery collections are offset
- order inventory and accounting are still reversed once only

### Workflow Separation

Generic `RETURN` creation through the old order-issue endpoint was blocked to avoid two competing return systems. The dedicated return endpoints are now the supported return path.

---

## Reporting Changes

Wholesaler and admin reporting logic was updated so returned amounts no longer continue to count as full realized revenue.

Updated reporting now subtracts return adjustments when computing:

- wholesaler advanced summary revenue
- wholesaler advanced summary product sold counts
- advisor monthly sales and category sales
- super admin revenue summaries
- tenant-level admin revenue views

This keeps operational dashboards closer to accounting reality after post-delivery returns.

---

## API Additions

The following endpoints were added:

- `POST /api/orders/:orderId/items/:itemId/request-return`
- `POST /api/orders/:orderId/items/:itemId/approve-return`
- `POST /api/orders/:orderId/items/:itemId/reject-return`
- `POST /api/orders/:orderId/items/:itemId/receive-return`
- `POST /api/orders/:orderId/items/:itemId/retry-return-refund`

The existing endpoint:

- `PUT /api/orders/:id/status`

now also performs COD auto-settlement when eligibility is met.

---

## Verification Performed

### New return-focused integration tests

[src/routes/orderReturns.integration.test.js](../src/routes/orderReturns.integration.test.js) verifies:

- COD delivery creates one auto-payment ledger entry and marks payment `PAID`
- COD return receipt restores inventory once and creates one charge reversal plus one settlement adjustment
- prepaid return refund retry does not duplicate inventory or accounting side effects
- prepaid return completion updates refund metadata and final order/item status correctly

### Existing regression coverage rerun

The following tests were rerun successfully after the changes:

- `node --test src/routes/orderReturns.integration.test.js`
- `node --test src/routes/checkoutRoutes.test.js`
- `node --test src/routes/orderCancellation.integration.test.js`
- `Get-ChildItem -Path src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }`

---

## Production Impact

### What is improved

- wholesaler COD settlement is no longer a manual normal-flow step
- return handling is no longer mixed with cancellation logic
- ledger history is better structured for audit and diagnostics
- inventory restoration is correctly delayed until physical receipt
- prepaid refund retries no longer risk duplicate stock or accounting mutations
- reporting better reflects post-return revenue reality

### What remains intentionally manual

- manual ledger entry still exists for offline corrections, external settlements, or exceptional bookkeeping cases
- the generic issue flow still exists for refunds and disputes, but not for returns

---

## Conclusion

NexCart now has a stronger marketplace accounting flow across checkout, delivery, settlement, return receipt, refund retry, and reporting.

The implemented changes make the platform more operationally safe by:

- reducing routine manual accounting work
- adding transaction safety and idempotency
- separating cancellations from returns
- preserving auditable accounting history
- aligning revenue views more closely with actual net marketplace outcomes
