# BACKLOG-002: N+1 Query Loop in AI Khatta Save Transactions

## Issue Description
Inside the database transaction block of the `saveKhattaEntries` function in `src/controllers/khattaController.js`, a query to fetch the user matching each entry's `customerEmail` was being executed sequentially inside the iteration loop. 

For an invoice with dozens of entries, this resulted in dozens of sequential database read requests, adding significant network latency and locking database connections for longer periods inside the transactional scope.

---

## Resolution

Refactored the transaction block to batch-retrieve the user accounts:
1. Collected all unique, non-null customer emails from the request payload.
2. Performed a single batch read using Prisma `findMany` with the `in` operator.
3. Structured an in-memory `Map` associating lowercase email addresses to user objects for rapid $O(1)$ lookups.
4. Replaced the nested query within the `for...of` loop with a direct `Map.get()` check.

### Diff of Changes
```diff
@@ -44,14 +44,20 @@
     const wholesalerId = req.user.wholesalerId;
 
     const savedEntries = await prisma.$transaction(async (tx) => {
+      const emails = [...new Set(entries.map(e => e.customerEmail).filter(Boolean))];
+
+      const customers = await tx.user.findMany({
+        where: {
+          email: { in: emails },
+          role: 'CUSTOMER',
+        },
+      });
+
+      const customerMap = new Map(customers.map(c => [c.email.toLowerCase(), c]));
       const results = [];
+
       for (const entry of entries) {
-        const customer = await tx.user.findFirst({
-          where: { 
-            email: entry.customerEmail,
-            role: 'CUSTOMER',
-          },
-        });
+        const customer = entry.customerEmail ? customerMap.get(entry.customerEmail.toLowerCase()) : null;
 
         if (customer) {
           const newEntry = await tx.ledgerEntry.create({
```

---

## Verification
- Verified file syntax with `node --check src/controllers/khattaController.js` (Completed successfully).
- Verified full workspace JS file syntax with recursive checks (Completed successfully).
