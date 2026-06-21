# BACKLOG-001: AI Khatta Digitizer Save Operation Runtime Crash

## Issue Description

During the save operation in the AI Khatta digitizer module (`saveKhattaEntries` function in `src/controllers/khattaController.js`), a runtime database crash occurred.

### Root Causes

1. **Invalid Model Query**: The code was calling `tx.customer.findFirst`, but there is no `Customer` model defined in `schema.prisma`. Customers are represented as `User` with `role: CUSTOMER`.
2. **Invalid Schema Field**: The code passed `customerId` when creating `LedgerEntry` via `tx.ledgerEntry.create`. However, the `LedgerEntry` model contains a `userId` field to relate it back to the customer `User`, not a `customerId` field.

---

## Resolution

The `saveKhattaEntries` function was refactored as follows:

- Swapped `tx.customer.findFirst` for `tx.user.findFirst`.
- Added filters to ensure target user has `role: 'CUSTOMER'` and matches the `email` parsed from the invoice.
- Mapped the target user's `id` to the `userId` field (instead of `customerId`) in `tx.ledgerEntry.create`.

### Diff of Changes

```diff
@@ -46,8 +46,11 @@
     const savedEntries = await prisma.$transaction(async (tx) => {
       const results = [];
       for (const entry of entries) {
-        const customer = await tx.customer.findFirst({
-          where: { user: { email: entry.customerEmail } },
+        const customer = await tx.user.findFirst({
+          where: {
+            email: entry.customerEmail,
+            role: 'CUSTOMER',
+          },
         });

         if (customer) {
@@ -54,6 +54,6 @@
             data: {
               wholesalerId,
-              customerId: customer.id,
+              userId: customer.id,
               amount: parseFloat(entry.amount),
               description: `AI Scan: ${entry.notes}`,
               referenceId: 'AI_UPLOAD',
```

---

## Verification

- Verified file syntax with `node --check src/controllers/khattaController.js` (Completed successfully).
- Verified full workspace JS file syntax with recursive checks (Completed successfully).
