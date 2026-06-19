# NexCart Project Backlog & Code Audit Findings

This backlog catalogs architectural, frontend design, database performance, security, and logic issues identified during a comprehensive audit of the NexCart codebase. Each item is rated by priority and effort, notes the files and functions affected, and tracks the current resolution status.

---

## 1. Summary of Audit Findings

The following table summarizes the distribution of backlog items across categories, detailing the count of resolved, partially resolved, and active flaws.

| Category | Total Issues | Resolved | Partially Resolved | Active Flaws | Key Impact Area / Remaining Concerns |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Code Blockers & Bugs** | 3 | 2 | 0 | 1 | Unused variable in checkout can mask logic errors. |
| **Security & Vulnerabilities** | 10 | 6 | 0 | 4 | IDOR in ledger, no review duplication prevention, excessive body limit, missing role guards. |
| **Database Performance** | 6 | 3 | 0 | 3 | Unbounded queries in marketplace/stats/admin, no BlacklistedToken cleanup, token DB check per request. |
| **Architecture & Separation** | 5 | 3 | 0 | 2 | Duplicate middleware calls, monolithic Cart.jsx checkout file. |
| **Frontend Design & React** | 19 | 13 | 0 | 6 | Console.log in production, Dashboard inconsistency, missing a11y, AiKhatta file validation, exhaustive-deps warnings. |
| **AI Service & RAG** | 3 | 3 | 0 | 0 | None. |
| **Linter & Code Standards** | 3 | 1 | 0 | 2 | Prettier formatting drift across backend and frontend, unused vars. |

---

## 2. Complete Backlog Index & Status Tracking

| ID | Title | Category | Priority | Status | Resolution Summary / Current Flaw Impact |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **BACKLOG-001** | AI Khatta Digitizer Save Operation Runtime Crash | Code Blockers | CRITICAL | **RESOLVED** | Refactored `saveKhattaEntries` to use `tx.user` query and map to `userId` field. |
| **BACKLOG-002** | N+1 Query Loop in AI Khatta Save Transactions | Code Blockers | HIGH | **RESOLVED** | Batch-queries customer users beforehand and maps them in-memory. |
| **BACKLOG-003** | JWT Secret Key Log Leak on Server Startup | Security | HIGH | **RESOLVED** | The plain-text `JWT_SECRET` debug console log has been completely removed from startup files. |
| **BACKLOG-004** | Missing Rate Limiting on Auth & Scanners | Security | HIGH | **RESOLVED** | Installed `express-rate-limit` and applied limiters to sensitive auth and AI scanner endpoints. |
| **BACKLOG-005** | Lax CORS Configuration | Security | MEDIUM | **RESOLVED** | Dynamically parses `ALLOWED_ORIGINS` variable and validates origins. |
| **BACKLOG-006** | Lack of Password Complexity Validation | Security | MEDIUM | **RESOLVED** | Complexity check added to `validateRegistrationPayload` in `authValidation.js`. |
| **BACKLOG-007** | No Token Blacklisting on Logout & Durations | Security | LOW | **RESOLVED** | JWT lifespan reduced to 1h and blacklisted on backend upon client logout. |
| **BACKLOG-008** | Unindexed Foreign Keys in PostgreSQL | DB Performance | HIGH | **RESOLVED** | Added `@@index` mappings to relational keys in `schema.prisma`. |
| **BACKLOG-009** | Heavy On-the-Fly Balance Aggregations | DB Performance | LOW | **RESOLVED** | Added cached balance field, automated hooks via extensions, and normalized shipping address fields. |
| **BACKLOG-010** | Monolithic Route Files Bypassing Controllers | Architecture | HIGH | **RESOLVED** | Created statsController.js and refactored statsRoutes.js to map endpoint routes directly to the controller handlers. |
| **BACKLOG-011** | Write N+1 Performance Bottleneck in Checkout | Architecture | MEDIUM | **RESOLVED** | Optimized checkout loop to execute stock updates concurrently via Promise.all and batch log creations via createMany. |
| **BACKLOG-012** | Unbounded In-Memory FastAPI Session Cache | Architecture | MEDIUM | **RESOLVED** | Implemented custom standard-library TTLCache with LRU eviction policy and 1-hour session TTL. |
| **BACKLOG-013** | Case-Sensitivity File Import Build Blocker | Frontend React | HIGH | **RESOLVED** | Updated Login import in App.jsx to match correct filename case. |
| **BACKLOG-014** | Synchronous SetState inside useEffect | Frontend React | MEDIUM | **RESOLVED** | Affected pages refactored to TanStack React Query, completely removing direct `useEffect` fetches. |
| **BACKLOG-015** | Monolithic Page UI Components | Frontend React | MEDIUM | **RESOLVED** | Decomposed monolithic page components into modular components in `/components/dashboard/`, `/components/advisor/`, and `/components/orders/`. |
| **BACKLOG-016** | Hardcoded Axios Base URL | Frontend React | LOW | **RESOLVED** | Replaced the hardcoded base URL string with environment-driven variable baseURL configurations. |
| **BACKLOG-017** | Hand-Rolled Auth Persistence & Expirations | Frontend React | LOW | **RESOLVED** | Refactored authStore.js to use Zustand native persist, and added a dynamic circular-safe 401/403 interceptor to axios.js. |
| **BACKLOG-018** | Missing Cart Store Persistence | Frontend React | LOW | **RESOLVED** | Refactored `cartStore.js` to utilize Zustand `persist` middleware. |
| **BACKLOG-019** | Client-Side Performance Fetching Waterfall | Frontend React | HIGH | **RESOLVED** | Combined waterfalls on `ProductDetails.jsx` into concurrent React Query hook operations. |
| **BACKLOG-020** | Redundant useMemo for Simple Primitives | Frontend React | LOW | **RESOLVED** | Removed `useMemo`; `stockStatus` is now computed directly during render via inline IIFE. |
| **BACKLOG-021** | Folderisation Standard Deviations & Dead Code | Frontend React | MEDIUM | **RESOLVED** | Deleted dead `Store.jsx`, removed its import from `App.jsx`, and deleted empty `components/customer/` directory. |
| **BACKLOG-022** | Unhandled Errors & Stock Overdrafts | Frontend React | HIGH | **RESOLVED** | Auth error clearing and cart stock validation were prior fixes; `Store.jsx` dead code deleted in BACKLOG-021. |
| **BACKLOG-023** | Client-Side Request Lifecycle Memory Leaks | Frontend React | HIGH | **RESOLVED** | Added active-flag cleanup guards to all async useEffect hooks in `BusinessAdvisor.jsx` and `SellerProductDetails.jsx`. |
| **BACKLOG-024** | Absolute File Path Disclosure in Citations | AI & RAG | HIGH | **RESOLVED** | Applied `os.path.basename` in `citation_service.py` and `prompt_builder.py` to strip directory paths from source metadata. |
| **BACKLOG-025** | Redundant On-the-Fly BM25 Index Compilation | AI & RAG | HIGH | **RESOLVED** | Implemented in-memory BM25 cache with lazy init and invalidation on `/ingest`. |
| **BACKLOG-026** | Hardcoded CPU Devices & Startup Cold-Starts | AI & RAG | MEDIUM | **RESOLVED** | Dynamic device detection (CUDA/MPS/CPU) and lifespan warm-call to pre-load model on startup. |
| **BACKLOG-027** | Weak Default JWT Secret Key | Security | HIGH | **RESOLVED** | Replaced placeholder key with a generated base64 256-bit key and wrote setup guides. |
| **BACKLOG-028** | Unbounded Data Loading in Popularity Scores | DB Performance | HIGH | **RESOLVED** | Popularity logic refactored into raw SQL queries executing in PostgreSQL with 30-day window limits. |
| **BACKLOG-029** | Redundant Click-Tracking Logic | Frontend React | LOW | **RESOLVED** | Extracted click-tracking calls to shared `trackRecommendationClick` function in `utils/recommendation.js`. |
| **BACKLOG-030** | Missing Rollup Vendor Chunks | Frontend React | MEDIUM | **RESOLVED** | Added `manualChunks` config to `vite.config.js` splitting `recharts`, `lucide-react`, `react`, and `@tanstack/react-query` into vendor chunks. |
| **BACKLOG-031** | ESLint Warning: Unused calculateDecay | Linter | LOW | **RESOLVED** | Removed dead `calculateDecay` function and `DAY_MS` constant from `popularityService.js`. |
| **BACKLOG-032** | Unused `totalAmount` Variable in Checkout | Code Blockers | MEDIUM | **ACTIVE** | Variable assigned but never used in COD/Credit checkout path; may mask a missing total-validation step. |
| **BACKLOG-033** | IDOR in Ledger `recordPayment` — Arbitrary User Targeting | Security | HIGH | **ACTIVE** | Wholesaler can record payments against any userId without verifying a business relationship exists. |
| **BACKLOG-034** | No Duplicate Review Prevention | Security | MEDIUM | **ACTIVE** | `addReview` creates reviews without checking if the user already reviewed the product, allowing unlimited reviews. |
| **BACKLOG-035** | Excessive 50 MB JSON Body Parser Limit | Security | HIGH | **ACTIVE** | `express.json({ limit: '50mb' })` in `app.js` enables trivial memory exhaustion DoS attacks. |
| **BACKLOG-036** | Missing Role Guards on B2B Routes | Security | HIGH | **ACTIVE** | `createRfq`, `acceptQuote`, `buyerRespondToRfq`, and `getBuyerCreditStatus` routes lack role-based middleware; any authenticated user can invoke them. |
| **BACKLOG-037** | Unbounded Marketplace Product Loading — No Pagination | DB Performance | HIGH | **ACTIVE** | `getMarketplaceProducts` loads all in-stock products into memory without limit/offset, scaling linearly with catalog size. |
| **BACKLOG-038** | Super Admin `buildAdminOverview` Loads Entire Database | DB Performance | HIGH | **ACTIVE** | Fetches all users, wholesalers with nested relations, all products, and all orders into Node.js heap on every admin dashboard load. |
| **BACKLOG-039** | BlacklistedToken Table Unbounded Growth | DB Performance | MEDIUM | **ACTIVE** | No scheduled cleanup of expired tokens from `BlacklistedToken`. The table and index grow indefinitely, slowing auth middleware lookup. |
| **BACKLOG-040** | Duplicate `authenticate` Middleware on Order Routes | Architecture | LOW | **ACTIVE** | `orderRoutes.js` calls `router.use(authenticate)` then applies `authenticate` again on each individual route handler. |
| **BACKLOG-041** | Monolithic Cart/Checkout Component (800+ lines) | Architecture | MEDIUM | **ACTIVE** | `Cart.jsx` contains all checkout logic (address CRUD, pincode lookup, Razorpay integration, B2B credit validation) in a single 800+ line file. |
| **BACKLOG-042** | Production `console.log` in Storefront.jsx | Frontend React | LOW | **ACTIVE** | Debug `console.log('Storefront State Debug:', {...})` left in production code, leaking internal state to browser console. |
| **BACKLOG-043** | Dashboard Uses Manual useEffect Instead of TanStack Query | Frontend React | MEDIUM | **ACTIVE** | `Dashboard.jsx` uses manual `useEffect` + `setState` pattern while the rest of the app uses TanStack Query, creating inconsistent caching, error handling, and refetch behavior. |
| **BACKLOG-044** | AiKhatta Missing File Size Validation & Blob URL Cleanup | Frontend React | MEDIUM | **ACTIVE** | No client-side file size limit check before base64 encoding; `URL.createObjectURL` preview is never revoked, causing memory leaks. |
| **BACKLOG-045** | Missing Accessibility Labels on Interactive Elements | Frontend React | MEDIUM | **ACTIVE** | Storefront search input, category filter buttons, collection buttons, and product cards lack `aria-label` or accessible names for screen readers. |
| **BACKLOG-046** | React Hooks Exhaustive-Deps Warnings | Frontend React | LOW | **ACTIVE** | `useMemo` in `Ledger.jsx` (line 323) and `SuperAdminSubscriptions.jsx` (line 217) have missing dependencies (`handleUpdateLimit`, `handleDeleteCoupon`), risking stale closures. |
| **BACKLOG-047** | Inventory `adjustStock` Allows Negative Stock | Frontend React | MEDIUM | **ACTIVE** | No floor check prevents `currentStock` from going below zero via manual adjustments, which can produce invalid inventory state. |
| **BACKLOG-048** | Prettier Formatting Drift Across Codebase | Linter | LOW | **ACTIVE** | 55 prettier errors in backend (`orderController.js`, `statsController.js`, `b2bRoutes.js`, test files) and 18 in frontend (`SellerProductDetails.jsx`). |
| **BACKLOG-049** | Unused Variables in Prisma Extension & Tests | Linter | LOW | **ACTIVE** | 14 `no-unused-vars` for `model`/`operation` in `db.js` Prisma extension hooks, and unused `t` param in `couponAndTrial.test.js`. |

---

## 3. Detailed Backlog Items & Code Audits

### Category: Code Blockers & Runtime Bugs

#### [BACKLOG-001] AI Khatta Digitizer Save Operation Runtime Crash
- **Status:** **RESOLVED**
- **Priority:** CRITICAL
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [khattaController.js](../src/controllers/khattaController.js) (Function: `saveKhattaEntries`)
  - [schema.prisma](../prisma/schema.prisma) (Models: `User`, `LedgerEntry`)
- **Resolution:** Refactored `saveKhattaEntries` to use `tx.user.findFirst` filtering by `email` and role `'CUSTOMER'`. Mapped the customer's user ID to `userId` instead of `customerId` when creating the `LedgerEntry` model database write.

#### [BACKLOG-002] N+1 Query Loop in AI Khatta Save Transactions
- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [khattaController.js](../src/controllers/khattaController.js) (Function: `saveKhattaEntries`)
- **Resolution:** Modified the transaction block to query unique customer emails at once using `tx.user.findMany` filtering by roles and email list, mapping the results to an in-memory lookup map to avoid multiple database SELECT calls inside the loop.

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
  - [app.js](../src/app.js)
  - [authRoutes.js](../src/routes/authRoutes.js)
  - [khattaRoutes.js](../src/routes/khattaRoutes.js)
- **Resolution:** Installed `express-rate-limit` and configured a global rate limiter in `app.js`, `authLimiter` in `authRoutes.js` (for registration and login endpoints), and `scanLimiter` in `khattaRoutes.js` (for image scanner parser endpoint).

#### [BACKLOG-005] Lax CORS Policy Configuration
- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [app.js](../src/app.js) (Line 30)
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
  - [authController.js](../src/controllers/authController.js) (Function: `login`)
  - [authStore.js](../client/src/store/authStore.js) (Function: `logout`)
- **Resolution:** Reduced JWT lifespan to 1h in `login`, added a `BlacklistedToken` database model, set up a backend `/logout` endpoint to insert the current token to the blacklist, and configured `authMiddleware.js` to reject blacklisted tokens. Triggered `/logout` asynchronously from frontend store `logout()`.

#### [BACKLOG-027] Weak Default JWT Secret Key
- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [backend/.env](../.env) (Line 2)
- **Description:** The application uses a weak default placeholder value (`your_super_secret_jwt_key_here`) for the `JWT_SECRET` key in the backend environment configuration. If this key is not regenerated, attackers can easily forge JWT signatures and gain unauthorized system permissions.
- **Resolution:** Replaced placeholder key with a secure generated 256-bit base64 key in `.env` and provided setup documentation for developers to regenerate keys.

---

### Category: Database Performance & Normalization

#### [BACKLOG-008] Unindexed Foreign Keys in PostgreSQL Schema
- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [schema.prisma](../prisma/schema.prisma)
- **Resolution:** Added `@@index` mappings to critical relation keys in the `Product`, `InventoryLog`, `Order`, `OrderItem`, and `LedgerEntry` models in `schema.prisma`. Pushed changes to database and regenerated Prisma Client.

#### [BACKLOG-009] Heavy On-the-Fly Aggregations and Denormalization
- **Status:** **RESOLVED**
- **Priority:** LOW
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [schema.prisma](../prisma/schema.prisma) (Models: `LedgerEntry`, `Order`)
  - [ledgerController.js](../src/controllers/ledgerController.js) (Function: `getCustomerLedger`)
- **Resolution:** Added a cached `balance` field to the `WholesalerCreditLimit` model and implemented a Prisma Client query extension using `Prisma.defineExtension` to automatically recalculate and update this balance during any write operation on `LedgerEntry` (within the transaction context if active). Refactored `getCustomerLedger` and `getMyLedger` to load this pre-calculated balance instead of doing in-memory reductions. Normalized the shipping address fields by adding `shippingStreet`, `shippingCity`, `shippingState`, and `shippingPostalCode` to the `Order` model, with index mappings on `shippingCity` and `shippingState` for optimized geographic groupings, and updated order checkout flows to populate these fields.

#### [BACKLOG-028] Database Performance: Unbounded Data Loading in Popularity Calculations
- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Resolution:** Grouping, decays, and scoring are now processed completely in PostgreSQL through raw SQL queries in `popularityService.js`. The query scope has been restricted to a rolling 30-day window (`AND "createdAt" >= now() - interval '30 days'`), preventing unbounded data loading into Node.js heap memory.

---

### Category: Architecture & Separation of Concerns

#### [BACKLOG-010] Monolithic Route Files Bypassing Controller Layer
- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [statsRoutes.js](../src/routes/statsRoutes.js) (Entire file)
- **Description:** The `statsRoutes.js` file contains extensive business logic, database queries, and mapping filters inside route definitions instead of delegating to controllers. This violates the **Controller-Service Separation** guideline defined in `AGENTS.md`, cluttering routing definitions.
- **Resolution:** Created `statsController.js` and refactored `statsRoutes.js` to delegate route mappings and endpoint logic to the controller handlers.

#### [BACKLOG-011] Write N+1 Performance Bottle-neck in Transactional Checkout
- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [orderController.js](../src/controllers/orderController.js) (Function: `createOrdersFromGroupedData`)
- **Description:** During order checkout, the transaction performs sequential `tx.inventoryLog.create` and `tx.product.update` queries inside a loop for each item. In large checkouts, this serial execution blocks transaction completion, tying up database connections.
- **Resolution:** Optimized checkout loop to execute stock updates concurrently via `Promise.all` and batch log creations via `createMany`.

#### [BACKLOG-012] Unbounded In-Memory Cache Memory Leak in FastAPI Memory Store
- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [session_memory.py](../ai-service/app/memory/session_memory.py) (Variable: `_memory_store`)
- **Description:** The FastAPI Python service stores customer chat history in a local global dictionary (`_memory_store`). The store is never pruned or expired. As new user sessions are initialized, memory consumption grows unboundedly, posing a risk of memory exhaustion (OOM) crashes in production.
- **Resolution:** Implemented custom standard-library `TTLCache` class with LRU eviction policy and 1-hour session TTL.

---

### Category: Frontend React & Tailwind Design

#### [BACKLOG-013] Case-Sensitivity File Import Build Blocker
- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [App.jsx](../client/src/App.jsx) (Line 22)
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
  - [Orders.jsx](../client/src/pages/Orders.jsx) (1023 lines)
  - [Dashboard.jsx](../client/src/pages/Dashboard.jsx) (548 lines)
  - [BusinessAdvisor.jsx](../client/src/pages/BusinessAdvisor.jsx) (437 lines)
- **Resolution:** Decomposed monolithic page components into modular components in `/components/dashboard/`, `/components/advisor/`, and `/components/orders/`. Refactored local states (drafts, active action items, toggles) and React Query mutation hooks directly into children components, simplifying parent pages to high-level layouts and loaders.

#### [BACKLOG-016] Hardcoded Axios Base URL
- **Status:** **RESOLVED**
- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [axios.js](../client/src/api/axios.js) (Line 4)
- **Resolution:** Replaced the hardcoded base URL string with `import.meta.env.VITE_API_URL || 'http://localhost:5000/api'` to allow configurable staging/production api targets.

#### [BACKLOG-017] Hand-Rolled Auth Persistence & Missing Expiry Handling
- **Status:** **RESOLVED**
- **Priority:** LOW
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [authStore.js](../client/src/store/authStore.js)
  - [axios.js](../client/src/api/axios.js)
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
  - [SellerProductDetails.jsx](../client/src/pages/SellerProductDetails.jsx) (Variable: `stockStatus`)
- **Description:** The component wraps a trivial conditional stock check in `useMemo`. This adds dependency tracking and memoization memory overhead for a lightweight operation, violating `rerender-simple-expression-in-memo`.
- **Resolution:** Removed `useMemo` and replaced with a direct inline IIFE computation during render. Removed the unused `useMemo` import from the file. See [BACKLOG-020-resolution.md](./BACKLOG-020-resolution.md) for full details.

#### [BACKLOG-021] Folderisation Standard Deviations & Dead Code
- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [Store.jsx](../client/src/pages/Store.jsx) (Dead Code — **Deleted**)
  - [App.jsx](../client/src/App.jsx) (Routes & lazy loading)
  - `/src/components/customer` (Empty directory — **Deleted**)
- **Description:**
  1. The project has empty component directory `src/components/customer` because pages are implemented as giant inline monoliths instead of modular components. (Note: `src/components/wholesaler` now contains `WholesalerAccessPanel.jsx`).
  2. Naming structure inconsistencies exist: `/pages/Login.jsx` is imported as `./pages/login` (lowercase) in `App.jsx`, which breaks in case-sensitive production environments.
  3. `Store.jsx` is dead code. It is imported in `App.jsx` but never used in any active routes (rendering is handled by `Storefront.jsx`).
- **Resolution:** Deleted the dead code file `Store.jsx` and removed its lazy import from `App.jsx`. The Login import casing was already corrected in BACKLOG-013. Removed the empty `components/customer/` directory to clean up project structure. See [BACKLOG-021-resolution.md](./BACKLOG-021-resolution.md) for full details.

#### [BACKLOG-022] State Management Issues - Unhandled Errors & Stock Overdrafts
- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [authStore.js](../client/src/store/authStore.js) (Functions: `login`, `register`)
  - [cartStore.js](../client/src/store/cartStore.js) (Function: `addToCart`)
- **Description:**
  1. `authStore.js` fails to clear the `error` state on successful `login` or `register` calls. (Note: Resolved, now clears on call initialization and success).
  2. `cartStore.js` allows customers to add items to their cart exceeding available stock. (Note: Resolved, local stock validation checks against `product.currentStock` have been added to prevent overdrafts).
  3. The dead code page `Store.jsx` implements a local react state cart instead of using the global Zustand `cartStore`. (Note: Resolved, file deleted in BACKLOG-021).
- **Resolution:** All three sub-issues are now resolved. Auth error clearing and cart stock validation were prior fixes. The dead code `Store.jsx` was deleted in BACKLOG-021. See [BACKLOG-022-resolution.md](./BACKLOG-022-resolution.md) for full details.

#### [BACKLOG-023] Client-Side Request Lifecycle Memory Leaks & Race Conditions
- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [BusinessAdvisor.jsx](../client/src/pages/BusinessAdvisor.jsx) (Function: `fetchBusinessContext`, `fetchHistory`)
  - [SellerProductDetails.jsx](../client/src/pages/SellerProductDetails.jsx) (Function: `fetchProduct`)
- **Description:** The asynchronous data fetching routines inside component `useEffect` hooks lack request cancellation or active-flag checks on unmount. If a user quickly navigates between pages or alters input queries, pending API requests continue executing in the background. Once they resolve, they invoke `setState` on unmounted component instances, preventing garbage collection until network completion. Additionally, this introduces state race conditions where slow legacy queries resolve after newer queries, populating the UI with stale data.
- **Resolution:** Added active-flag cleanup guards to all async `useEffect` hooks. `fetchBusinessContext` and `fetchProduct` accept a mutable `active` ref object (`{ current: true }`), set to `false` in the effect cleanup. `fetchHistory` uses a local `let active` boolean. All `setState` calls are guarded behind `if (active.current)` / `if (active)` checks. See [BACKLOG-023-resolution.md](./BACKLOG-023-resolution.md) for full details.

#### [BACKLOG-029] Code Reusability: Redundant Click-Tracking Logic
- **Status:** **RESOLVED**
- **Priority:** LOW
- **Resolution:** click-event logging and navigation logic have been extracted into a single helper utility function `trackRecommendationClick` in `client/src/utils/recommendation.js`, simplifying both `Storefront.jsx` and `ProductDetails.jsx`.

#### [BACKLOG-030] Code Splitting: Missing Rollup Vendor Chunks for Large Libraries
- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [vite.config.js](../client/vite.config.js)
- **Description:** The Vite configuration has no custom Rollup chunk-splitting setup. Heavy libraries (such as `recharts` and large barrel imports from `lucide-react`) are bundled inside route bundles without manual vendor splitting, leading to layout chunk bloat.
- **Resolution:** Configured `rollupOptions.output.manualChunks` in `vite.config.js` to split heavy libraries into standalone vendor chunks: `vendor-react` (react, react-dom, react-router-dom), `vendor-recharts` (recharts), `vendor-icons` (lucide-react), and `vendor-query` (@tanstack/react-query). See [BACKLOG-030-resolution.md](./BACKLOG-030-resolution.md) for full details.

---

### Category: AI Service & RAG

#### [BACKLOG-024] AI Service Bug: Absolute File Path Disclosure in Citations & Context
- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [citation_service.py](../ai-service/app/services/citation_service.py) (Function: `build_citations`)
  - [prompt_builder.py](../ai-service/app/services/prompt_builder.py) (Function: `build_rag_context_text`)
- **Description:** The citation builder pulls the document `source` property directly from metadata without stripping directory paths. Since the loader stores the raw absolute system path of the PDF files (e.g. `./ai-service/app/docs/business_guide.pdf`), this absolute path is sent directly to the client browser in chat bubbles, exposing internal server directories. It is also injected in LLM prompts, increasing token consumption.
- **Resolution:** Applied `os.path.basename()` in both `build_citations` and `build_rag_context_text` to extract only the filename (e.g., `business_guide.pdf`) from source metadata before output. See [BACKLOG-024-resolution.md](./BACKLOG-024-resolution.md) for full details.

#### [BACKLOG-025] AI Service Performance: Redundant On-the-Fly BM25 Index Compilation
- **Status:** **RESOLVED**
- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [retrieval_service.py](../ai-service/app/services/retrieval_service.py) (Functions: `retrieve_documents`, `get_knowledge_base_state`)
- **Description:** For every user query, the retrieval service invokes `get_knowledge_base_state()`, which retrieves _all_ documents in the database from ChromaDB, tokenizes the entire corpus, and builds a `BM25Okapi` search index from scratch in Python, discarding it immediately after. This triggers high-cost full database reads and expensive CPU/memory overhead on every user message, scaling linearly with the database size.
- **Resolution:** Implemented in-memory caching for the compiled BM25 index and documents array. The cache builds lazily on the first query and is invalidated/rebuilt via `invalidate_bm25_cache()` called from the `/ingest` endpoint after new PDFs are stored. Thread-safe locking prevents concurrent rebuild races. See [BACKLOG-025-resolution.md](./BACKLOG-025-resolution.md) for full details.

#### [BACKLOG-026] AI Service Performance: Hardcoded CPU Devices & Startup Cold-Starts
- **Status:** **RESOLVED**
- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [embedder.py](../ai-service/app/embeddings/embedder.py) (Function: `get_embedder`)
  - [main.py](../ai-service/app/main.py) (Lifespan events)
- **Description:**
  1. The embedding model is hardcoded to run on `cpu` (`model_kwargs={"device": "cpu"}`), preventing optimization on environments equipped with GPUs (CUDA/MPS).
  2. The model weights are loaded dynamically on demand during the first query, leading to a several-second cold-start delay for the initial chatbot or ingestion execution.
- **Resolution:** Replaced the hardcoded `"cpu"` string with a `_detect_device()` function using `torch.cuda.is_available()` and `torch.backends.mps.is_available()` for dynamic hardware detection. Added an `asynccontextmanager` lifespan in `main.py` that warm-calls `get_embedder()` at startup, pre-loading model weights before incoming traffic arrives. See [BACKLOG-026-resolution.md](./BACKLOG-026-resolution.md) for full details.

---

### Category: Linter & Code Standards

#### [BACKLOG-031] Linter Warning: Unused calculateDecay in popularityService.js
- **Status:** **RESOLVED**
- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [popularityService.js](../src/services/popularityService.js) (Line 6, symbol: `calculateDecay`)
- **Description:** During the database query refactoring of the popularity calculations, the decay calculation was moved completely in-database. The in-memory javascript helper function `calculateDecay` was left in the file but is no longer used, raising an ESLint `no-unused-vars` error which causes build/lint warnings.
- **Resolution:** Removed the unused `calculateDecay` function definition and its supporting `DAY_MS` constant. See [BACKLOG-031-resolution.md](./BACKLOG-031-resolution.md) for full details.


---

## 4. Active Backlog Items (June 2026 Audit)

The following items were identified during a comprehensive code audit performed on June 19, 2026. They represent current flaws that have not yet been addressed.

---

### Category: Code Blockers & Bugs

#### [BACKLOG-032] Unused `totalAmount` Variable in Checkout Transaction
- **Status:** **ACTIVE**
- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [orderController.js](../src/controllers/orderController.js) (Function: `checkout`, line ~486)
- **Description:** Inside the `checkout` handler's `$transaction` block, `totalAmount` is computed via `Object.values(ordersBySeller).reduce(...)` but never used afterwards. The `LEDGER_CREDIT` path references individual seller order totals directly. The unused variable either represents dead code from a refactor, or indicates a missing total-amount validation step (e.g., verifying the aggregate total doesn't exceed a system-wide threshold).
- **Suggested Fix:** Either remove the unused assignment or wire it into the appropriate validation/logging path. Prefix with `_` if intentionally unused.

---

### Category: Security & Vulnerabilities

#### [BACKLOG-033] IDOR in Ledger `recordPayment` — Arbitrary User Targeting
- **Status:** **ACTIVE**
- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [ledgerController.js](../src/controllers/ledgerController.js) (Function: `recordPayment`)
- **Description:** The `recordPayment` endpoint accepts an arbitrary `userId` in the request body and only verifies the user exists (`prisma.user.findUnique`). It does not verify that the target user has any business relationship (orders, credit line, or RFQ) with the calling wholesaler. A malicious wholesaler could record fraudulent payment entries against any customer in the system, manipulating their ledger balance.
- **Suggested Fix:** Add a guard verifying the target `userId` has at least one `LedgerEntry`, `Order`, or `WholesalerCreditLimit` record linked to the calling wholesaler before allowing the payment creation.

#### [BACKLOG-034] No Duplicate Review Prevention
- **Status:** **ACTIVE**
- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [productController.js](../src/controllers/productController.js) (Function: `addReview`)
  - [schema.prisma](../prisma/schema.prisma) (Model: `Review`)
- **Description:** The `addReview` controller creates a `Review` without checking if the authenticated user has already submitted a review for the same product. This allows users to submit unlimited reviews, inflating or deflating rating averages. The `Review` model also lacks a `@@unique([productId, userId])` constraint.
- **Suggested Fix:** Add a `@@unique([productId, userId])` constraint to the `Review` model in the schema, and add a pre-check or handle the unique constraint violation gracefully in the controller.

#### [BACKLOG-035] Excessive 50 MB JSON Body Parser Limit
- **Status:** **ACTIVE**
- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [app.js](../src/app.js) (Line ~53: `express.json({ limit: '50mb' })`)
- **Description:** The Express JSON body parser is configured with a 50 MB limit. While this was likely set to accommodate the AI Khatta base64 image uploads, it applies globally to all routes. An attacker can send massive JSON payloads to any endpoint to exhaust server memory. The AI Khatta image upload is the only route requiring large payloads.
- **Suggested Fix:** Reduce the global JSON limit to a reasonable default (e.g., `1mb` or `2mb`) and apply a route-specific override with a higher limit only on `/api/khatta/process`.

#### [BACKLOG-036] Missing Role Guards on B2B Customer Routes
- **Status:** **ACTIVE**
- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [b2bRoutes.js](../src/routes/b2bRoutes.js) (Lines 31-35, 41-42, 48)
  - [b2bController.js](../src/controllers/b2bController.js) (Functions: `createRfq`, `acceptQuote`, `buyerRespondToRfq`, `getBuyerCreditStatus`)
- **Description:** Several B2B routes are only protected by `authenticate` (any logged-in user) without role-specific middleware. While the controller functions perform some internal checks (e.g., verifying an approved B2B profile), the route layer does not enforce role boundaries. A `WHOLESALER` or `SUPER_ADMIN` user could invoke buyer-only endpoints like `createRfq` or `acceptQuote` directly, bypassing the intended buyer-only flow. Similarly, `getBuyerCreditStatus` has no role enforcement at all.
- **Suggested Fix:** Add `requireRoles('CUSTOMER')` middleware to buyer-specific routes (`/rfq POST`, `/rfq/:id/accept`, `/rfq/:id/buyer-respond`, `/buyer/credit-limits`).

---

### Category: Database Performance

#### [BACKLOG-037] Unbounded Marketplace Product Loading — No Server-Side Pagination
- **Status:** **ACTIVE**
- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [productController.js](../src/controllers/productController.js) (Function: `getMarketplaceProducts`)
  - [queries.js](../client/src/api/queries.js) (Function: `fetchMarketplaceProducts`)
- **Description:** `getMarketplaceProducts` calls `prisma.product.findMany` with no `take`/`skip` parameters. As the product catalog grows, this query loads all in-stock products (with wholesaler and reviews relations) into memory on every storefront page load. The frontend also loads the full array without virtual scrolling. With 10,000+ products, this will cause significant latency and memory pressure on both server and client.
- **Suggested Fix:** Implement cursor-based or offset pagination on the API endpoint (`?page=1&pageSize=24`), and update the frontend `Storefront.jsx` to paginate or use infinite scroll backed by the API.

#### [BACKLOG-038] Super Admin `buildAdminOverview` Loads Entire Database into Memory
- **Status:** **ACTIVE**
- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [superAdminController.js](../src/controllers/superAdminController.js) (Function: `buildAdminOverview`)
- **Description:** The admin overview fetches ALL users, ALL wholesalers (with nested products, orders, subscriptions), ALL products, and ALL orders in parallel. Additionally, `getAllWholesalers` calls `buildAdminOverview()` again, effectively running the same expensive query twice on the wholesaler list page. As the platform scales, this creates severe memory pressure and slow response times.
- **Suggested Fix:** Refactor to use aggregation queries (`count`, `aggregate`, `groupBy`) for summary statistics, and paginate the wholesaler directory. Cache the overview with a short TTL (e.g., 60 seconds) to avoid redundant computation.

#### [BACKLOG-039] BlacklistedToken Table Unbounded Growth — No Expiry Cleanup
- **Status:** **ACTIVE**
- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [schema.prisma](../prisma/schema.prisma) (Model: `BlacklistedToken`)
  - [authMiddleware.js](../src/middlewares/authMiddleware.js) (Function: `authenticate`)
- **Description:** When users log out, their JWT is inserted into the `BlacklistedToken` table with an `expiresAt` timestamp. However, no scheduled job or database trigger ever removes expired entries. Since the `authenticate` middleware queries this table on every authenticated request, the table's unbounded growth degrades auth performance over time. Tokens that have already expired naturally (past their JWT `exp` claim) no longer need blacklisting.
- **Suggested Fix:** Create a scheduled job (cron or pg_cron) that periodically deletes rows where `expiresAt < NOW()`. Alternatively, add a Prisma middleware or application-level cleanup that runs daily.

---

### Category: Architecture & Separation of Concerns

#### [BACKLOG-040] Duplicate `authenticate` Middleware on Order Routes
- **Status:** **ACTIVE**
- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [orderRoutes.js](../src/routes/orderRoutes.js) (Lines 28-56)
- **Description:** `orderRoutes.js` applies `router.use(authenticate)` at line 28 (after the webhook route), making all subsequent routes authenticated. However, every individual route handler below it also redundantly includes `authenticate` as an inline middleware argument. This double-invocation causes the authentication logic (including the blacklisted token DB lookup) to execute twice per request — an unnecessary performance cost and code readability issue.
- **Suggested Fix:** Remove the per-route `authenticate` arguments since the `router.use(authenticate)` already covers them, or remove the `router.use` and keep per-route for explicitness — but not both.

#### [BACKLOG-041] Monolithic Cart/Checkout Component (800+ Lines)
- **Status:** **ACTIVE**
- **Priority:** MEDIUM
- **Effort:** L (Large)
- **AFFECTED FILES & SYMBOLS:**
  - [Cart.jsx](../client/src/pages/Cart.jsx) (Entire file, ~840 lines)
- **Description:** `Cart.jsx` handles: cart item rendering, quantity management, address CRUD (create/edit/delete/set-default), pincode API lookup with locality resolution, payment method selection, B2B credit validation, COD checkout, Razorpay prepaid flow initialization and verification, MOQ enforcement, and error handling. This violates the decomposition guideline established in BACKLOG-015 and makes the file difficult to test, review, or modify in isolation.
- **Suggested Fix:** Decompose into sub-components: `CartItemList`, `AddressManager`, `PincodeLookupForm`, `CheckoutSummary`, `PaymentMethodSelector`. Extract the Razorpay integration into a custom hook (`useRazorpayCheckout`). Move address state management into a dedicated hook or React Query mutations.

---

### Category: Frontend React & Design

#### [BACKLOG-042] Production `console.log` Debug Statement in Storefront.jsx
- **Status:** **ACTIVE**
- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [Storefront.jsx](../client/src/pages/Storefront.jsx) (Line ~215: `console.log('Storefront State Debug:', {...})`)
- **Description:** A verbose `console.log` outputs the internal state of marketplace products count, trending count, filters, and visible count to the browser console on every render. This leaks internal application state to end users and adds unnecessary noise in production logs.
- **Suggested Fix:** Remove the `console.log` statement, or gate it behind a development-only check (`import.meta.env.DEV`).

#### [BACKLOG-043] Dashboard.jsx Uses Manual useEffect Fetching (Inconsistent Pattern)
- **Status:** **ACTIVE**
- **Priority:** MEDIUM
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [Dashboard.jsx](../client/src/pages/Dashboard.jsx) (Lines 27-57: `useEffect` with `fetchDashboardData`)
- **Description:** `Dashboard.jsx` uses a manual `useEffect` + `Promise.all` + `setState` pattern for data fetching while the rest of the application (Products, Inventory, Ledger, Orders, Storefront) uses TanStack React Query hooks from `queries.js`. This inconsistency means:
  1. Dashboard data has no automatic background refetch or stale-time caching.
  2. There is no error state displayed to the user (errors are only `console.error`'d).
  3. Navigation away and back triggers a full refetch without cache benefits.
  4. The component does not benefit from React Query's deduplication if multiple components need the same data.
- **Suggested Fix:** Create `useDashboardData()` hook in `queries.js` that combines the four API calls (products, ledger summary, advisor context, orders) using `useQueries` or a single composite query, with proper loading/error states.

#### [BACKLOG-044] AiKhatta Missing File Size Validation & Blob URL Memory Leak
- **Status:** **ACTIVE**
- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [AiKhatta.jsx](../client/src/pages/AiKhatta.jsx) (Functions: `handleFileChange`, `handleProcessImage`)
- **Description:**
  1. **No file size validation:** The file input accepts any file regardless of size. Since the image is base64-encoded and sent in the request body (which has a 50 MB server limit), users can upload extremely large files that crash the browser tab during encoding or exceed even the generous server limit.
  2. **Blob URL leak:** `URL.createObjectURL(file)` is called to create an image preview but `URL.revokeObjectURL()` is never called when the component unmounts or the file changes, causing a memory leak for each file selection.
- **Suggested Fix:** Add a file size check (e.g., max 10 MB) in `handleFileChange` before setting state. Add a cleanup function in a `useEffect` that revokes the previous preview URL when it changes or on unmount.

#### [BACKLOG-045] Missing Accessibility Labels on Storefront Interactive Elements
- **Status:** **ACTIVE**
- **Priority:** MEDIUM
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [Storefront.jsx](../client/src/pages/Storefront.jsx) (Search input, category buttons, collection buttons, product cards)
- **Description:** The main customer-facing storefront page has several accessibility gaps:
  1. The search `<input>` has a placeholder but no associated `<label>` or `aria-label`.
  2. Category filter buttons have no `aria-pressed` or `aria-current` attribute to convey selection state.
  3. Collection toggle buttons similarly lack ARIA state attributes.
  4. Product cards are rendered as `<button>` elements but lack descriptive `aria-label` attributes (only visual content inside).
  5. The "Load More" pagination button lacks `aria-live` announcement for screen readers.
- **Suggested Fix:** Add `aria-label="Search products"` to the search input, `aria-pressed` to toggle buttons, descriptive `aria-label` to product card buttons (e.g., `aria-label={product.name}`), and wrap the product grid results in an `aria-live="polite"` region.

#### [BACKLOG-046] React Hooks `exhaustive-deps` Warnings in Table Components
- **Status:** **ACTIVE**
- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [Ledger.jsx](../client/src/pages/Ledger.jsx) (Line 323: `useMemo` for `creditColumns`)
  - [SuperAdminSubscriptions.jsx](../client/src/pages/SuperAdminSubscriptions.jsx) (Line 217: `useMemo` for columns)
- **Description:** Both components use `useMemo` to define table column configurations that reference handler functions (`handleUpdateLimit`, `handleDeleteCoupon`) but do not include these handlers in the dependency array. When the handlers change (due to state updates they close over), the memoized columns may reference stale closures, potentially causing UI bugs where clicking a button operates on outdated state.
- **Suggested Fix:** Either include the handlers in the `useMemo` dependency array, or stabilize the handlers with `useCallback` and include them.

#### [BACKLOG-047] Inventory `adjustStock` Allows Negative Stock Values
- **Status:** **ACTIVE**
- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [inventoryController.js](../src/controllers/inventoryController.js) (Function: `adjustStock`)
- **Description:** The `adjustStock` controller uses `product.update({ data: { currentStock: { increment: changeAmount } } })` without validating that the resulting stock remains >= 0. A wholesaler can submit a large negative `changeAmount` that decrements stock below zero, producing invalid inventory state that can confuse checkout stock validation, analytics, and the storefront display.
- **Suggested Fix:** Add a check: `if (product.currentStock + changeAmount < 0) return res.status(400).json({ error: 'Adjustment would result in negative stock' })`. Alternatively, use `updateMany` with a `where: { currentStock: { gte: -changeAmount } }` atomic guard similar to checkout's `decrementProductStockAtomic`.

---

### Category: Linter & Code Standards

#### [BACKLOG-048] Prettier Formatting Drift Across Backend & Frontend
- **Status:** **ACTIVE**
- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - Backend: `orderController.js` (12 errors), `statsController.js` (2), `superAdminController.js` (1), `b2bRoutes.js` (1), `index.js` (1), `contentRecommendationService.js` (1), `couponAndTrial.test.js` (13)
  - Frontend: `SellerProductDetails.jsx` (18 errors)
- **Description:** A total of 73 Prettier formatting violations exist across the codebase (55 backend + 18 frontend). This indicates that recent code changes were committed without running the formatter, or that editor/CI format-on-save is not consistently enforced.
- **Suggested Fix:** Run `pnpm run format` at the root level to auto-fix all formatting issues. Consider adding a pre-commit hook (e.g., `lint-staged` + `husky`) to prevent formatting drift from recurring.

#### [BACKLOG-049] Unused Variables in Prisma Extension Hooks & Test Files
- **Status:** **ACTIVE**
- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [db.js](../src/config/db.js) (Lines 40, 51, 71, 82, 109, 120, 131: `model` and `operation` params in Prisma extension query hooks)
  - [couponAndTrial.test.js](../src/routes/couponAndTrial.test.js) (Line 39: unused `t` parameter)
- **Description:** Prisma's `defineExtension` query hooks receive `model` and `operation` destructured parameters that are required by the API signature but not used in the NexCart implementation. This triggers 14 ESLint `no-unused-vars` errors. The test file also has an unused `t` parameter. While these are not functional bugs, they pollute the lint output and can mask real unused-variable issues.
- **Suggested Fix:** Prefix unused required parameters with underscore (`_model`, `_operation`, `_t`) to satisfy the ESLint rule while maintaining the function signature.
