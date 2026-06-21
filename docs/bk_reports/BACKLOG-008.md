# BACKLOG-008: Unindexed Foreign Keys in PostgreSQL Schema

## Issue Description

Critical foreign keys used for common database queries (such as listing user transactions, order items, products under a wholesaler, and customer balances) were missing indices. This forced PostgreSQL to perform expensive full table scans, degrading performance as transaction and inventory volumes grew.

---

## Resolution

We added index annotations (`@@index`) in `prisma/schema.prisma` to the following models:

1. **`Product` model**:
   - `@@index([wholesalerId])`
   - `@@index([category])`
   - `@@index([currentStock])`
2. **`InventoryLog` model**:
   - `@@index([wholesalerId])`
   - `@@index([productId])`
3. **`Order` model**:
   - `@@index([sellerId])`
   - `@@index([buyerId])`
   - `@@index([status])`
4. **`OrderItem` model**:
   - `@@index([productId])`
5. **`LedgerEntry` model**:
   - `@@index([wholesalerId])`
   - `@@index([userId])`

### Diff of Changes

#### [schema.prisma](file:///c:/Users/smufa/Desktop/NexCart_updated/prisma/schema.prisma)

```diff
@@ -409,6 +409,10 @@

   createdAt DateTime @default(now())
   updatedAt DateTime @updatedAt
+
+  @@index([wholesalerId])
+  @@index([category])
+  @@index([currentStock])
 }

 model InventoryLog {
@@ -421,6 +421,9 @@
   reason       InventoryChangeReason

   createdAt DateTime @default(now())
+
+  @@index([wholesalerId])
+  @@index([productId])
 }

 model Order {
@@ -451,6 +451,10 @@

   createdAt DateTime @default(now())
   updatedAt DateTime @updatedAt
+
+  @@index([sellerId])
+  @@index([buyerId])
+  @@index([status])
 }

 model PrepaidCheckoutSession {
@@ -520,6 +520,7 @@
   @@index([refundStatus])
   @@index([returnStatus])
   @@index([returnRefundStatus])
+  @@index([productId])
 }

 model Cart {
@@ -719,6 +719,8 @@
   createdAt DateTime @default(now())

   @@index([orderId])
+  @@index([wholesalerId])
+  @@index([userId])
 }
```

---

## Verification

- Validated Prisma schema syntax using `npx prisma validate` (Completed successfully).
- Synchronized schema updates to the PostgreSQL database with `npx prisma db push` (Completed successfully).
- Regenerated the Prisma Client using `npx prisma generate` (Completed successfully).
- Verified that all backend unit/integration tests run successfully.
