# BACKLOG-010: Monolithic Route Files Bypassing Controller Layer

## Issue Description
The `statsRoutes.js` file contained extensive business logic, database queries, and mapping filters inside route definitions instead of delegating to controllers. This violated the **Controller-Service Separation** guideline defined in `AGENTS.md`, cluttering routing definitions.

---

## Resolution

We resolved this architectural issue by decoupling route mappings from query execution:
1. **Created statsController.js**: We created a new controller file at `src/controllers/statsController.js` and moved all database querying, aggregations, and business logic into the following exported named methods:
   - `getWholesalerSummary`
   - `getAdvisorContext`
   - `getAdvancedSummary`
   - `getAnalyticsOverview`
   We also moved corresponding helper utilities (`getCurrentMonthRange`, `toNumber`, `getReturnedAmountByItemId`) into the controller file as internal helper functions.
2. **Refactored statsRoutes.js**: We updated `src/routes/statsRoutes.js` to remove all database aggregations and helper utilities. The route file now simply imports the route handlers from the new controller and registers them with the appropriate path and middlewares (`authenticate`, `requireWholesaler`, `requireWholesalerFeature`).

---

## Files Changed

### 1. [statsController.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/controllers/statsController.js)
- Created the file and implemented the controller handlers and helper utilities.

### 2. [statsRoutes.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/routes/statsRoutes.js)
- Refactored to map the HTTP endpoints directly to controller methods.

---

## Verification
- Checked syntax of the new controller and updated routes using `node --check`.
- Ran unit/integration tests with `pnpm run test`, executing **47/47 passing tests** successfully.
