# NexCart Resolved Project Backlog Items

This document catalogs the historical architectural, performance, security, and logic issues identified in the NexCart audit that have been fully resolved.

---

## Complete Resolved Backlog Details

### Category: Code Blockers & Runtime Bugs

#### [BACKLOG-001] AI Khatta Digitizer Save Operation Runtime Crash

- **Status:** **RESOLVED**
- **Priority:** CRITICAL
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [khattaController.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/controllers/khattaController.js) (Function: `saveKhattaEntries`)
  - [schema.prisma](file:///c:/Users/smufa/Desktop/NexCart_updated/prisma/schema.prisma) (Models: `User`, `LedgerEntry`)
- **Resolution:** Refactored `saveKhattaEntries` to use `tx.user.findFirst` filtering by `email` and role `'CUSTOMER'`. Mapped the customer's user ID to `userId` instead of `customerId` when creating the `LedgerEntry` model database write.

#### [BACKLOG-002] N+1 Query Loop in AI Khatta Save Transactions

- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [khattaController.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/controllers/khattaController.js) (Function: `saveKhattaEntries`)
- **Resolution:** Modified the transaction block to query unique customer emails at once using `tx.user.findMany` filtering by roles and email list, mapping the results to an in-memory lookup map to avoid multiple database SELECT calls inside the loop.

#### [BACKLOG-032] Unused `totalAmount` Variable in Checkout Transaction

- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [orderController.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/controllers/orderController.js) (Function: `checkout`)
- **Description:** Inside the `checkout` handler's `$transaction` block, `totalAmount` was computed via `Object.values(ordersBySeller).reduce(...)` but never used afterwards.
- **Resolution:** During code refactoring and cleanups (like the prepaid checkout sessions integrations), the unused `totalAmount` assignment was safely removed from the default checkout flow and is now correctly wired/stored in prepaid checkout session creation models.

#### [BACKLOG-047] Inventory `adjustStock` Allows Negative Stock Values

- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [inventoryController.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/controllers/inventoryController.js) (Function: `adjustStock`)
- **Resolution:** Added a validation check inside the `adjustStock` controller to reject negative stock adjustments if `currentStock + parsedAmount < 0`. Created a corresponding test suite in `inventory.test.js` covering both failure and success cases.

---

### Category: Security & Vulnerabilities

#### [BACKLOG-003] JWT Secret Key Log Leak on Server Startup

- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Resolution:** The plain-text `console.log('ENV TEST:', process.env.JWT_SECRET)` debug statement has been removed from `src/index.js` and other server startup scripts.

#### [BACKLOG-004] Missing Rate Limiting on Authentication & Scanners

- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [app.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/app.js)
  - [authRoutes.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/routes/authRoutes.js)
  - [khattaRoutes.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/routes/khattaRoutes.js)
- **Resolution:** Installed `express-rate-limit` and configured a global rate limiter in `app.js`, `authLimiter` in `authRoutes.js` (for registration and login endpoints), and `scanLimiter` in `khattaRoutes.js` (for image scanner parser endpoint).

#### [BACKLOG-005] Lax CORS Policy Configuration

- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [app.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/app.js) (Line 30)
- **Resolution:** Refactored `cors` config in `app.js` to parse origin whitelist from `process.env.ALLOWED_ORIGINS` (or fallback to local localhost values) and validate incoming origins dynamically.

#### [BACKLOG-006] Lack of Password Complexity Validation

- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Resolution:** Password complexity guidelines were added to `authValidation.js` using regexes to enforce at least 8 characters, an uppercase/lowercase letter, a number, and a special character. This is checked inside `validateRegistrationPayload` during user registration.

#### [BACKLOG-007] No Token Blacklisting on Logout & Excessive Expiry Duration

- **Status:** **RESOLVED**
- **Priority:** LOW
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [authController.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/controllers/authController.js) (Function: `login`)
  - [authStore.js](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/store/authStore.js) (Function: `logout`)
- **Resolution:** Reduced JWT lifespan to 1h in `login`, added a `BlacklistedToken` database model, set up a backend `/logout` endpoint to insert the current token to the blacklist, and configured `authMiddleware.js` to reject blacklisted tokens. Triggered `/logout` asynchronously from frontend store `logout()`.

#### [BACKLOG-033] IDOR in Ledger `recordPayment` — Arbitrary User Targeting

- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [ledgerController.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/controllers/ledgerController.js) (Function: `recordPayment`)
  - [ledger.integration.test.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/routes/ledger.integration.test.js)
- **Resolution:** Added authorization guards in `recordPayment` to.require the target `userId` have an existing buyer relationship with the requesting wholesaler. The endpoint now verifies an existing `LedgerEntry`, `Order`, or `WholesalerCreditLimit` before creating a payment entry. Regression coverage was added for unrelated buyer rejection and allowed payments via order, credit-limit, and ledger-entry relationships.

#### [BACKLOG-034] No Duplicate Review Prevention

- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [productController.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/controllers/productController.js) (Function: `addReview`)
  - [schema.prisma](file:///c:/Users/smufa/Desktop/NexCart_updated/prisma/schema.prisma) (Model: `Review`)
  - [productReviews.integration.test.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/routes/productReviews.integration.test.js)
- **Resolution:** Added a pre-check in `productController.addReview` to reject duplicate reviews by the same user for the same product and gracefully handle Prisma unique constraint violations. Added a `@@unique([productId, userId])` constraint to the `Review` model to enforce single-review semantics at the database level.

#### [BACKLOG-035] Excessive 50 MB JSON Body Parser Limit

- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [app.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/app.js)
- **Resolution:** Reduced global JSON and URL-encoded body parser limits from 50mb to 2mb. Added route-specific overrides for `/api/khatta` endpoints allowing 50mb payloads to support base64-encoded image uploads while protecting the rest of the API from oversized JSON payload attacks.

#### [BACKLOG-027] Weak Default JWT Secret Key

- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [backend/.env](file:///c:/Users/smufa/Desktop/NexCart_updated/.env) (Line 2)
- **Description:** The application uses a weak default placeholder value (`your_super_secret_jwt_key_here`) for the `JWT_SECRET` key in the backend environment configuration. If this key is not regenerated, attackers can easily forge JWT signatures and gain unauthorized system permissions.
- **Resolution:** Replaced placeholder key with a secure generated 256-bit base64 key in `.env` and provided setup documentation for developers to regenerate keys.

#### [BACKLOG-036] Missing Role Guards on B2B Customer Routes

- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [b2bRoutes.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/routes/b2bRoutes.js) (Routes: `/rfq` POST, `/rfq/:id/accept` POST, `/rfq/:id/buyer-respond` POST, `/buyer/credit-limits` GET)
  - [b2bController.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/controllers/b2bController.js) (Functions: `createRfq`, `acceptQuote`, `buyerRespondToRfq`, `getBuyerCreditStatus`)
  - [b2b.integration.test.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/routes/b2b.integration.test.js)
- **Resolution:** Added `requireRoles('CUSTOMER')` middleware guard to B2B customer-specific routes (create Rfq, accept quote, buyer-respond, and get buyer credit limits) in `b2bRoutes.js` to prevent other roles (like `WHOLESALER` or `SUPER_ADMIN`) from performing buyer-only actions. Implemented `getBuyerCreditStatus` in `b2bController.js` to return a list of a customer's credit limits and balances across all wholesalers, and exposed this under `/api/b2b/buyer/credit-limits`. Added test assertions in `b2b.integration.test.js` to verify non-CUSTOMER roles are blocked with a `403 Forbidden` status code and a valid CUSTOMER can fetch their credit status.

---

### Category: Database Performance & Normalization

#### [BACKLOG-008] Unindexed Foreign Keys in PostgreSQL Schema

- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [schema.prisma](file:///c:/Users/smufa/Desktop/NexCart_updated/prisma/schema.prisma)
- **Resolution:** Added `@@index` mappings to critical relation keys in the `Product`, `InventoryLog`, `Order`, `OrderItem`, and `LedgerEntry` models in `schema.prisma`. Pushed changes to database and regenerated Prisma Client.

#### [BACKLOG-009] Heavy On-the-Fly Aggregations and Denormalization

- **Status:** **RESOLVED**
- **Priority:** LOW
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [schema.prisma](file:///c:/Users/smufa/Desktop/NexCart_updated/prisma/schema.prisma) (Models: `LedgerEntry`, `Order`)
  - [ledgerController.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/controllers/ledgerController.js) (Function: `getCustomerLedger`)
- **Resolution:** Added a cached `balance` field to the `WholesalerCreditLimit` model and implemented a Prisma Client query extension using `Prisma.defineExtension` to automatically recalculate and update this balance during any write operation on `LedgerEntry` (within the transaction context if active). Refactored `getCustomerLedger` and `getMyLedger` to load this pre-calculated balance instead of doing in-memory reductions. Normalized the shipping address fields by adding `shippingStreet`, `shippingCity`, `shippingState`, and `shippingPostalCode` to the `Order` model, with index mappings on `shippingCity` and `shippingState` for optimized geographic groupings, and updated order checkout flows to populate these fields.

#### [BACKLOG-028] Database Performance: Unbounded Data Loading in Popularity Calculations

- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Resolution:** Grouping, decays, and scoring are now processed completely in PostgreSQL through raw SQL queries in `popularityService.js`. The query scope has been restricted to a rolling 30-day window (`AND "createdAt" >= now() - interval '30 days'`), preventing unbounded data loading into Node.js heap memory.

#### [BACKLOG-037] Unbounded Marketplace Product Loading — No Server-Side Pagination

- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [productController.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/controllers/productController.js) (Function: `getMarketplaceProducts`)
  - [queries.js](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/api/queries.js) (Functions: `fetchMarketplaceProducts`, `useMarketplaceProductsInfinite`)
  - [Storefront.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/pages/Storefront.jsx)
- **Resolution:** Refactored `getMarketplaceProducts` to support offset-based pagination (`page` and `pageSize`), search filtering, category filtering, and sorting (`newArrivals`, `topRated`, `topSelling`) on the server. Added helper query key mapping in `queries.js` and wrapped the storefront fetching with TanStack Query's `useInfiniteQuery`. Updated the storefront UI to fetch paginated products dynamically and fetch Top Selling and Bestseller lists via dedicated, limited-size backend queries.

#### [BACKLOG-038] Super Admin `buildAdminOverview` Loads Entire Database into Memory

- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [superAdminController.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/controllers/superAdminController.js) (Functions: `buildAdminOverview`, `getAllWholesalers`)
- **Resolution:** Refactored the global overview stats logic to use lightweight database aggregation queries (counts, user role groupBys, and raw SQL queries for stock and revenue aggregates). Introduced module-level in-memory caching with a 60-second TTL on `/api/admin/stats` and invalidation hooks on approval/rejection/lifecycle mutations. Rewrote the wholesaler list endpoint `/api/admin/wholesalers` to execute direct, paginated, and searchable database queries rather than invoking the heavy stats compiler.

#### [BACKLOG-039] BlacklistedToken Table Unbounded Growth — No Expiry Cleanup

- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [schema.prisma](file:///c:/Users/smufa/Desktop/NexCart_updated/prisma/schema.prisma) (Model: `BlacklistedToken`)
  - [authMiddleware.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/middlewares/authMiddleware.js) (Function: `authenticate`)
- **Resolution:** Introduced a backend background worker in `tokenCleanupJob.js` that periodically deletes expired records (`expiresAt < NOW()`) from the `BlacklistedToken` table. The job runs immediately on server startup to prune expired records, and schedules a periodic cleanup interval every 24 hours. The cleanup interval is unreferenced (`.unref()`) to allow clean server exits and test runner completions. Registered and invoked the cleanup worker during backend bootstrap in `index.js`.

---

### Category: Architecture & Separation of Concerns

#### [BACKLOG-040] Duplicate `authenticate` Middleware on Order Routes

- **Status:** **RESOLVED**
- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [orderRoutes.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/routes/orderRoutes.js) (Lines 28-56)
- **Resolution:** Removed the redundant inline `authenticate` middleware arguments from all individual route definitions in `orderRoutes.js`. Since the file already declares `router.use(authenticate)` globally for all routes below the webhook endpoint, the routes remain fully protected without executing authentication logic (and its database lookups) twice per request.

#### [BACKLOG-010] Monolithic Route Files Bypassing Controller Layer

- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [statsRoutes.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/routes/statsRoutes.js) (Entire file)
- **Description:** The `statsRoutes.js` file contains extensive business logic, database queries, and mapping filters inside route definitions instead of delegating to controllers. This violates the **Controller-Service Separation** guideline defined in `AGENTS.md`, cluttering routing definitions.
- **Resolution:** Created `statsController.js` and refactored `statsRoutes.js` to delegate route mappings and endpoint logic to the controller handlers.

#### [BACKLOG-011] Write N+1 Performance Bottle-neck in Transactional Checkout

- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [orderController.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/controllers/orderController.js) (Function: `createOrdersFromGroupedData`)
- **Description:** During order checkout, the transaction performs sequential `tx.inventoryLog.create` and `tx.product.update` queries inside a loop for each item. In large checkouts, this serial execution blocks transaction completion, tying up database connections.
- **Resolution:** Optimized checkout loop to execute stock updates concurrently via `Promise.all` and batch log creations via `createMany`.

#### [BACKLOG-012] Unbounded In-Memory Cache Memory Leak in FastAPI Memory Store

- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [session_memory.py](file:///c:/Users/smufa/Desktop/NexCart_updated/ai-service/app/memory/session_memory.py) (Variable: `_memory_store`)
- **Description:** The FastAPI Python service stores customer chat history in a local global dictionary (`_memory_store`). The store is never pruned or expired. As new user sessions are initialized, memory consumption grows unboundedly, posing a risk of memory exhaustion (OOM) crashes in production.
- **Resolution:** Implemented custom standard-library `TTLCache` class with LRU eviction policy and 1-hour session TTL.

---

### Category: Frontend React & Tailwind Design

#### [BACKLOG-013] Case-Sensitivity File Import Build Blocker

- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [App.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/App.jsx) (Line 22)
- **Description:** On line 22 of `App.jsx`, the Login page is imported using `./pages/login` instead of `./pages/Login` (capital L). While Windows is case-insensitive (and compiles fine locally), compiling or running builds on case-sensitive Linux build environments (e.g. Vercel, Netlify, Docker) will throw a fatal module compilation crash.
- **Resolution:** Updated the import statement to use `./pages/Login` to maintain exact case correspondence.

#### [BACKLOG-014] Synchronous SetState inside useEffect (Linter Errors)

- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Resolution:** Modified pages (`Ledger.jsx`, `Inventory.jsx`, `Products.jsx`, `ProductDetails.jsx`) have been refactored to use react-query hooks imported from `queries.js` instead of manual `useEffect` fetching blocks, eliminating synchronous mounting state updates.

#### [BACKLOG-015] Monolithic Page UI Components (Decomposability)

- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** L (Large)
- **AFFECTED FILES & SYMBOLS:**
  - [Orders.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/pages/Orders.jsx) (1023 lines)
  - [Dashboard.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/pages/Dashboard.jsx) (548 lines)
  - [BusinessAdvisor.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/pages/BusinessAdvisor.jsx) (437 lines)
- **Resolution:** Decomposed monolithic page components into modular components in `/components/dashboard/`, `/components/advisor/`, and `/components/orders/`. Refactored local states (drafts, active action items, toggles) and React Query mutation hooks directly into children components, simplifying parent pages to high-level layouts and loaders.

#### [BACKLOG-016] Hardcoded Axios Base URL

- **Status:** **RESOLVED**
- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [axios.js](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/api/axios.js) (Line 4)
- **Resolution:** Replaced the hardcoded base URL string with `import.meta.env.VITE_API_URL || 'http://localhost:5000/api'` to allow configurable staging/production api targets.

#### [BACKLOG-017] Hand-Rolled Auth Persistence & Missing Expiry Handling

- **Status:** **RESOLVED**
- **Priority:** LOW
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [authStore.js](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/store/authStore.js)
  - [axios.js](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/api/axios.js)
- **Resolution:**
  1. Migrated `authStore.js` to Zustand's native `persist` middleware under storage key `'nexcart-auth-storage'`. Maintained manual writes in actions for backward compatibility with vanilla storage reads.
  2. Implemented an Axios response interceptor inside `axios.js` to catch `401 Unauthorized` and `403 Forbidden` responses. Dynamic module import is used to invoke the auth store's `logout()` method to bypass load-time circular dependencies, and the browser is redirected to `/login` (preventing redirect loops on active auth routes).

#### [BACKLOG-018] Missing Cart Store Persistence

- **Status:** **RESOLVED**
- **Priority:** LOW
- **Resolution:** Zustand `persist` middleware has been applied to `cartStore.js` to persist the cart items array in localStorage automatically, solving state clearing on page reload.

#### [BACKLOG-019] Vercel React Best Practices - Client-Side Performance Fetching Waterfall

- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Resolution:** Watermarked fetches inside `ProductDetails.jsx` are resolved by importing React Query query hooks (`useProductDetail` and `useSimilarProducts`) which manage background states concurrently.

#### [BACKLOG-020] Vercel React Best Practices - Redundant useMemo for Simple Primitives

- **Status:** **RESOLVED**
- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [SellerProductDetails.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/pages/SellerProductDetails.jsx) (Variable: `stockStatus`)
- **Description:** The component wraps a trivial conditional stock check in `useMemo`. This adds dependency tracking and memoization memory overhead for a lightweight operation, violating `rerender-simple-expression-in-memo`.
- **Resolution:** Removed `useMemo` and replaced with a direct inline IIFE computation during render. Removed the unused `useMemo` import from the file.

#### [BACKLOG-021] Folderisation Standard Deviations & Dead Code

- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - `Store.jsx` (Dead Code — **Deleted**)
  - [App.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/App.jsx) (Routes & lazy loading)
  - `/src/components/customer` (Empty directory — **Deleted**)
- **Description:**
  1. The project has empty component directory `src/components/customer` because pages are implemented as giant inline monoliths instead of modular components.
  2. Naming structure inconsistencies exist: `/pages/Login.jsx` is imported as `./pages/login` (lowercase) in `App.jsx`, which breaks in case-sensitive production environments.
  3. `Store.jsx` is dead code. It is imported in `App.jsx` but never used in any active routes (rendering is handled by `Storefront.jsx`).
- **Resolution:** Deleted the dead code file `Store.jsx` and removed its lazy import from `App.jsx`. The Login import casing was already corrected in BACKLOG-013. Removed the empty `components/customer/` directory to clean up project structure.

#### [BACKLOG-022] State Management Issues - Unhandled Errors & Stock Overdrafts

- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [authStore.js](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/store/authStore.js) (Functions: `login`, `register`)
  - [cartStore.js](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/store/cartStore.js) (Function: `addToCart`)
- **Description:**
  1. `authStore.js` fails to clear the `error` state on successful `login` or `register` calls.
  2. `cartStore.js` allows customers to add items to their cart exceeding available stock.
  3. The dead code page `Store.jsx` implements a local react state cart instead of using the global Zustand `cartStore`.
- **Resolution:** All three sub-issues are now resolved. Auth error clearing and cart stock validation were prior fixes. The dead code `Store.jsx` was deleted in BACKLOG-021.

#### [BACKLOG-023] Client-Side Request Lifecycle Memory Leaks & Race Conditions

- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [BusinessAdvisor.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/pages/BusinessAdvisor.jsx) (Function: `fetchBusinessContext`, `fetchHistory`)
  - [SellerProductDetails.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/pages/SellerProductDetails.jsx) (Function: `fetchProduct`)
- **Description:** The asynchronous data fetching routines inside component `useEffect` hooks lack request cancellation or active-flag checks on unmount. If a user quickly navigates between pages or alters input queries, pending API requests continue executing in the background. Once they resolve, they invoke `setState` on unmounted component instances, preventing garbage collection until network completion. Additionally, this introduces state race conditions where slow legacy queries resolve after newer queries, populating the UI with stale data.
- **Resolution:** Added active-flag cleanup guards to all async `useEffect` hooks. `fetchBusinessContext` and `fetchProduct` accept a mutable `active` ref object (`{ current: true }`), set to `false` in the effect cleanup. `fetchHistory` uses a local `let active` boolean. All `setState` calls are guarded behind `if (active.current)` / `if (active)` checks.

#### [BACKLOG-029] Code Reusability: Redundant Click-Tracking Logic

- **Status:** **RESOLVED**
- **Priority:** LOW
- **Resolution:** Click-event logging and navigation logic have been extracted into a single helper utility function `trackRecommendationClick` in `client/src/utils/recommendation.js`, simplifying both `Storefront.jsx` and `ProductDetails.jsx`.

#### [BACKLOG-030] Code Splitting: Missing Rollup Vendor Chunks for Large Libraries

- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [vite.config.js](file:///c:/Users/smufa/Desktop/NexCart_updated/client/vite.config.js)
- **Description:** The Vite configuration has no custom Rollup chunk-splitting setup. Heavy libraries (such as `recharts` and large barrel imports from `lucide-react`) are bundled inside route bundles without manual vendor splitting, leading to layout chunk bloat.
- **Resolution:** Configured `rollupOptions.output.manualChunks` in `vite.config.js` to split heavy libraries into standalone vendor chunks: `vendor-react` (react, react-dom, react-router-dom), `vendor-recharts` (recharts), `vendor-icons` (lucide-react), and `vendor-query` (@tanstack/react-query).

#### [BACKLOG-046 (Part 1)] React Hooks `exhaustive-deps` Warnings in `Ledger.jsx` Table Component

- **Status:** **RESOLVED**
- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [Ledger.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/pages/Ledger.jsx)
- **Description:** The component defined table column configurations referencing action handlers but omitted them from dependency arrays, risking stale closures.
- **Resolution:** During the major B2B Ledger redesign, the complex DataTable column structures were replaced by clean, direct inline mapped HTML tables. This eliminated the column `useMemo` hooks entirely, resolving the warning and potential stale closure bug in `Ledger.jsx`.

#### [BACKLOG-046 (Part 2)] React Hooks `exhaustive-deps` Warnings in Table Component Columns

- **Status:** **RESOLVED**
- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [SuperAdminSubscriptions.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/pages/SuperAdminSubscriptions.jsx) (Line 217: `useMemo` for columns)
- **Resolution:** Stabilized the handler functions `handleDeleteCoupon` and `refreshWorkspace` by wrapping them inside `useCallback` hooks, reordered declarations so callbacks are initialized before they are referenced, and added `handleDeleteCoupon` to the columns `useMemo` dependency array, resolving all linter warnings.

#### [BACKLOG-042] Production `console.log` Debug Statement in Storefront.jsx

- **Status:** **RESOLVED**
- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [Storefront.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/pages/Storefront.jsx) (Line ~186)
- **Resolution:** Removed the verbose `console.log` debug statement block logging the internal state of products and active search/filters to keep production logs clean.

#### [BACKLOG-043] Dashboard.jsx Uses Manual useEffect Fetching (Inconsistent Pattern)

- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [Dashboard.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/pages/Dashboard.jsx) (Lines 27-57)
- **Resolution:** Created `fetchDashboardData` and custom hook `useDashboardData()` in `queries.js` that fetch the operational dashboard details (products, orders, ledgerStats, advisorContext, profile) concurrently inside a single React Query instance. Refactored `Dashboard.jsx` to consume this hook, reducing local states and implementing query-driven loading, error boundaries, and auto-invalidation on updates.

#### [BACKLOG-044] AiKhatta Missing File Size Validation & Blob URL Memory Leak

- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [AiKhatta.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/pages/AiKhatta.jsx) (Functions: `handleFileChange`, `handleProcessImage`)
- **Resolution:**
  - Added a file size check in `handleFileChange` to reject any upload exceeding 10MB and clean up state fields.
  - Implemented a `useEffect` hook to revoke the temporary Blob URL on selected file change and component unmount.

#### [BACKLOG-045] Missing Accessibility Labels on Storefront Interactive Elements

- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [Storefront.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/pages/Storefront.jsx) (Search input, category buttons, collection buttons, product cards)
- **Resolution:** Implemented accessibility attributes across storefront interactive elements:
  - Added `aria-label="Search products, shops, categories"` to the search input.
  - Added `aria-pressed={selectedCategory === category}` to the category filter buttons.
  - Added `aria-pressed={selectedCollection === collection}` to the collection filter buttons.
  - Added `aria-label={`View details for ${product.name}`}` to the parent button of the product cards.
  - Added `aria-label={isWishlisted ? \`Remove \${product.name} from wishlist\` : \`Add \${product.name} to wishlist\`}` to the product card wishlist buttons.
  - Added `aria-live="polite"` to the main product grid container and the "Load More" pagination button to announce dynamic storefront content updates to screen readers.

---

### Category: AI Service & RAG

#### [BACKLOG-024] AI Service Bug: Absolute File Path Disclosure in Citations & Context

- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - `citation_service.py` (Function: `build_citations`)
  - `prompt_builder.py` (Function: `build_rag_context_text`)
- **Description:** The citation builder pulls the document `source` property directly from metadata without stripping directory paths. Since the loader stores the raw absolute system path of the PDF files (e.g. `./ai-service/app/docs/business_guide.pdf`), this absolute path is sent directly to the client browser in chat bubbles, exposing internal server directories. It is also injected in LLM prompts, increasing token consumption.
- **Resolution:** Applied `os.path.basename()` in both `build_citations` and `build_rag_context_text` to extract only the filename (e.g., `business_guide.pdf`) from source metadata before output.

#### [BACKLOG-025] AI Service Performance: Redundant On-the-Fly BM25 Index Compilation

- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - `retrieval_service.py` (Functions: `retrieve_documents`, `get_knowledge_base_state`)
- **Description:** For every user query, the retrieval service invokes `get_knowledge_base_state()`, which retrieves _all_ documents in the database from ChromaDB, tokenizes the entire corpus, and builds a `BM25Okapi` search index from scratch in Python, discarding it immediately after. This triggers high-cost full database reads and expensive CPU/memory overhead on every user message, scaling linearly with the database size.
- **Resolution:** Implemented in-memory caching for the compiled BM25 index and documents array. The cache builds lazily on the first query and is invalidated/rebuilt via `invalidate_bm25_cache()` called from the `/ingest` endpoint after new PDFs are stored. Thread-safe locking prevents concurrent rebuild races.

#### [BACKLOG-026] AI Service Performance: Hardcoded CPU Devices & Startup Cold-Starts

- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - `embedder.py` (Function: `get_embedder`)
  - `main.py` (Lifespan events)
- **Description:**
  1. The embedding model is hardcoded to run on `cpu` (`model_kwargs={"device": "cpu"}`), preventing optimization on environments equipped with GPUs (CUDA/MPS).
  2. The model weights are loaded dynamically on demand during the first query, leading to a several-second cold-start delay for the initial chatbot or ingestion execution.
- **Resolution:** Replaced the hardcoded `"cpu"` string with a `_detect_device()` function using `torch.cuda.is_available()` and `torch.backends.mps.is_available()` for dynamic hardware detection. Added an `asynccontextmanager` lifespan in `main.py` that warm-calls `get_embedder()` at startup, pre-loading model weights before incoming traffic arrives.

#### [BACKLOG-050] Python Module-Level Imports Not at Top of File (Ruff E402)

- **Status:** **RESOLVED**
- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [main.py](file:///c:/Users/smufa/Desktop/NexCart_updated/ai-service/app/main.py)
- **Resolution:** Added `# ruff: noqa: E402` to the top of `main.py` to allow module-level imports after the initial configuration environment loading logic.

---

### Category: Linter & Code Standards

#### [BACKLOG-031] Linter Warning: Unused calculateDecay in popularityService.js

- **Status:** **RESOLVED**
- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [popularityService.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/services/popularityService.js) (Line 6, symbol: `calculateDecay`)
- **Description:** During the database query refactoring of the popularity calculations, the decay calculation was moved completely in-database. The in-memory javascript helper function `calculateDecay` was left in the file but is no longer used, raising an ESLint `no-unused-vars` error which causes build/lint warnings.
- **Resolution:** Removed the unused `calculateDecay` function definition and its supporting `DAY_MS` constant.

#### [BACKLOG-048] Prettier Formatting Drift Across Backend & Frontend

- **Status:** **RESOLVED**
- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - Backend: `orderController.js`, `statsController.js`, `superAdminController.js`, `b2bRoutes.js`, `index.js`, `contentRecommendationService.js`, `couponAndTrial.test.js`
  - Frontend: `SellerProductDetails.jsx`
- **Resolution:** Executed project-wide formatting via `pnpm run format` (or root `npm run format`), auto-fixing and bringing all 73 styling drift occurrences back to standard code styling rules.

#### [BACKLOG-049] Unused Variables in Prisma Extension Hooks & Test Files

- **Status:** **RESOLVED**
- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [db.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/config/db.js) (destructured query extension hooks parameters)
  - [couponAndTrial.test.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/routes/couponAndTrial.test.js)
- **Resolution:** Added underscores to prefix the destructured arguments `_model` and `_operation` in the Prisma extension hooks to signify they are purposefully unused query callback metadata, and removed the unused parameter from `couponAndTrial.test.js` to ensure clean ESLint builds.

#### [BACKLOG-051] Ambiguous Single-Character Variable Name `l` (Ruff E741)

- **Status:** **RESOLVED**
- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [multi_query.py](file:///c:/Users/smufa/Desktop/NexCart_updated/ai-service/app/rag/multi_query.py) (Line 26)
- **Resolution:** Renamed the single-character variable `l` in the list comprehension to the descriptive name `line` to improve code readability and satisfy the Ruff E741 linter rule.

---

### Category: Architecture & Separation of Concerns

#### [BACKLOG-041] Monolithic Cart/Checkout Component (800+ Lines)

- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** L (Large)
- **AFFECTED FILES & SYMBOLS:**
  - [Cart.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/pages/Cart.jsx) (Entire file)
- **Resolution:** Decomposed the massive 840+ line component into modular subcomponents and hooks in `client/src/components/cart/`:
  - `useRazorpayCheckout`: custom hook for Razorpay script load and prepaid payment lifecycle.
  - `useAddressManager`: custom hook for address list loading, selection state, and debounced lookup.
  - `CartItemList`: displays items list and quantity updates.
  - `AddressEditorForm` / `AddressManager`: manages address card layout and forms.
  - `CheckoutSummary`: displays pricing breakdowns and checkout options.
    Refactored `Cart.jsx` into a simple, declarative orchestration wrapper (~260 lines).
