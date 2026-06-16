# NexCart Project Backlog & Code Audit Findings

This backlog catalogs architectural, frontend design, database performance, security, and logic issues identified during a comprehensive audit of the NexCart codebase. Each item is rated by priority and effort, and notes the files and functions affected.

---

## 1. Summary of Audit Findings

| Category                       | Total Issues | Critical/High Severity | Key Impact Area                                                                                                                                     |
| :----------------------------- | :----------- | :--------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Security & Vulnerabilities** | 7            | 3                      | Secret leaks, weak encryption keys, unauthorized access, lack of rate limiting, unrevoked tokens                                                    |
| **Code Blockers & Bugs**       | 2            | 2                      | Runtime crashes in AI Khatta Vision digitizer module                                                                                                |
| **Database Performance**       | 3            | 2                      | Unindexed foreign keys, memory/DB query bottlenecks in popularity service causing sequential table scans                                            |
| **Architecture & Separation**  | 4            | 1                      | Inline business logic in routes, N+1 checkout writes, memory leaks, dead code & directory layout                                                    |
| **Frontend Design & React**    | 12           | 4                      | Case-sensitivity build blocker, synchronous `setState` in `useEffect`, fetching waterfalls, state management issues, request lifecycle memory leaks |
| **AI Service & RAG**           | 3            | 2                      | Unbounded BM25 compilation, absolute file path data leak, dynamic GPU setup & cold-start initialization                                             |

---

## 2. Detailed Backlog Items

### Category: Code Blockers & Runtime Bugs

#### [BACKLOG-001] AI Khatta Digitizer Save Operation Runtime Crash

- **Priority:** CRITICAL
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [khattaController.js](../src/controllers/khattaController.js) (Function: `saveKhattaEntries`)
  - [schema.prisma](../prisma/schema.prisma) (Models: `User`, `LedgerEntry`)
- **Description:** The AI Khatta digitization module crashes on save. The controller makes a call to `tx.customer.findFirst`, but there is no `Customer` model in the Prisma schema (customers are represented as `User` with `role: CUSTOMER`). Furthermore, the write operation provides `customerId: customer.id` to the `LedgerEntry` model, which only has a `userId` field.
- **Proposed Resolution:** Refactor `saveKhattaEntries` to search for customers using `tx.user.findFirst` filtering by `email` and role, then map the result to `userId` instead of `customerId` when creating `LedgerEntry`.

#### [BACKLOG-002] N+1 Query Loop in AI Khatta Save Transactions

- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [khattaController.js](../src/controllers/khattaController.js) (Function: `saveKhattaEntries`)
- **Description:** Inside `saveKhattaEntries`, the save loop performs a `tx.customer.findFirst` query for every single scanned row. In a scan of an invoice with dozens of items, this triggers dozens of individual database read roundtrips inside a single transactional block.
- **Proposed Resolution:** Query all customers in a single batch select before the loop using `tx.user.findMany({ where: { email: { in: emails } } })` and map them in-memory, eliminating the query loop.

---

### Category: Security & Vulnerabilities

#### [BACKLOG-003] JWT Secret Key Log Leak on Server Startup

- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [index.js](../src/index.js) (Line 23)
- **Description:** The backend initialization script prints the plain-text value of `process.env.JWT_SECRET` to standard output logs (`console.log('ENV TEST:', process.env.JWT_SECRET);`). If application logs are written to system files, log aggregators, or CI/CD pipelines, this exposes the encryption secret, enabling attackers to forge valid credentials.
- **Proposed Resolution:** Remove the debug logging statement immediately.

#### [BACKLOG-004] Missing Rate Limiting on Authentication & Scanners

- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [index.js](../src/index.js)
  - [authRoutes.js](../src/routes/authRoutes.js)
  - [khattaRoutes.js](../src/routes/khattaRoutes.js)
- **Description:** Public-facing endpoints such as registration (`/api/auth/register`), login (`/api/auth/login`), and image scanner parser (`/api/khatta/process`) are unprotected by rate limiters. This exposes the server to password brute-forcing, script resource consumption, and high costs from Google Gemini API spam.
- **Proposed Resolution:** Install `express-rate-limit` and configure global middleware, applying a strict limit (e.g., 5 requests per minute) on sensitive authentication and AI-parsing endpoints.

#### [BACKLOG-005] Lax CORS Policy Configuration

- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [index.js](../src/index.js) (Line 28)
- **Description:** CORS is configured using wildcard defaults (`app.use(cors())`), allowing credentials and API invocations from any origin. This poses security risks in production.
- **Proposed Resolution:** Configure specific origin arrays based on environments using environment variables (e.g., `process.env.ALLOWED_ORIGINS`).

#### [BACKLOG-006] Lack of Password Complexity Validation

- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [authController.js](../src/controllers/authController.js) (Function: `register`)
- **Description:** The user registration endpoint hashes passwords using Bcrypt but does not validate password length or complexity. Users can register with trivial passwords (e.g., single-character passwords), leaving accounts highly vulnerable to credential guessing.
- **Proposed Resolution:** Add backend validation checks requiring passwords to meet baseline metrics (e.g., minimum 8 characters, alphanumeric mix) before calling the hashing library.

#### [BACKLOG-007] No Token Blacklisting on Logout & Excessive Expiry Duration

- **Priority:** LOW
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [authController.js](../src/controllers/authController.js) (Function: `login`)
  - [authStore.js](../client/src/store/authStore.js) (Function: `logout`)
- **Description:** JWT access tokens are signed with a 7-day expiration time (`7d`) without refresh token rotation. Furthermore, when logging out on the frontend, the token is simply removed from client storage. Because the backend doesn't black-list or track revoked tokens, a compromised token remains valid until it expires.
- **Proposed Resolution:** Reduce access token lifespan to 1 hour and implement refresh tokens stored in `httpOnly` secure cookies. Alternatively, implement a lightweight Redis-based blacklist to record revoked tokens on logout.

---

### Category: Database Performance & Normalization

#### [BACKLOG-008] Unindexed Foreign Keys in PostgreSQL Schema

- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [schema.prisma](../prisma/schema.prisma)
- **Description:** Critical foreign keys used for common database queries are missing indices. This forces PostgreSQL to perform full table scans for operations that scale with transactional volume. Missing indexes include:
  - `Product(wholesalerId, category, currentStock)`
  - `InventoryLog(wholesalerId, productId)`
  - `Order(sellerId, buyerId, status)`
  - `OrderItem(orderId, productId)`
  - `LedgerEntry(wholesalerId, userId)`
- **Proposed Resolution:** Add `@@index` mappings to the corresponding models in `schema.prisma` to allow indexing of relational keys.

#### [BACKLOG-009] Heavy On-the-Fly Aggregations and Denormalization

- **Priority:** LOW
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [schema.prisma](../prisma/schema.prisma) (Models: `LedgerEntry`, `Order`)
  - [ledgerController.js](../src/controllers/ledgerController.js) (Function: `getCustomerLedger`)
- **Description:**
  1.  The running balance of a customer is calculated on-the-fly inside `getCustomerLedger` by fetching and summing all matching ledger rows in-memory. As customer transactional history grows, this calculation degrades performance.
  2.  `shippingAddress` is stored as an unnormalized flat string in the `Order` model, preventing structured query grouping by geographic location (e.g. city/state analytics).
- **Proposed Resolution:**
  1.  Create a cached or store-persisted balance attribute on the customer relation that updates during ledger entry creation.
  2.  Normalize address fields into separate columns (street, city, state, postalCode) or a structured JSON schema.

---

### Category: Architecture & Separation of Concerns

#### [BACKLOG-010] Monolithic Route Files Bypassing Controller Layer

- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [statsRoutes.js](../src/routes/statsRoutes.js) (Entire file)
- **Description:** The `statsRoutes.js` file contains extensive business logic, database queries, and mapping filters inside route definitions instead of delegating to controllers. This violates the **Controller-Service Separation** guideline defined in `AGENTS.md`, cluttering routing definitions.
- **Proposed Resolution:** Create a `statsController.js` and move the operational handlers (e.g., `wholesaler-summary`, `advisor-context`, `advanced-summary`) to it. Keep `statsRoutes.js` strictly mapped to endpoint registrations pointing to controller endpoints.

#### [BACKLOG-011] Write N+1 Performance Bottle-neck in Transactional Checkout

- **Priority:** MEDIUM
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [orderController.js](../src/controllers/orderController.js) (Function: `createOrdersFromGroupedData`)
- **Description:** During order checkout, the transaction performs sequential `tx.inventoryLog.create` and `tx.product.update` queries inside a loop for each item. In large checkouts, this serial execution blocks transaction completion, tying up database connections.
- **Proposed Resolution:** Use batch operations. Insert logs in bulk using `createMany` (Prisma API) and update stock records using parameterized SQL or bulk updates where possible.

#### [BACKLOG-012] Unbounded In-Memory Cache Memory Leak in FastAPI Memory Store

- **Priority:** MEDIUM
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [session_memory.py](../ai-service/app/memory/session_memory.py) (Variable: `_memory_store`)
- **Description:** The FastAPI Python service stores customer chat history in a local global dictionary (`_memory_store`). The store is never pruned or expired. As new user sessions are initialized, memory consumption grows unboundedly, posing a risk of memory exhaustion (OOM) crashes in production.
- **Proposed Resolution:** Implement a TTL-based cache dictionary (using libraries like `cachetools`) or swap the memory store for a Redis cache.

---

### Category: Frontend React & Tailwind Design

#### [BACKLOG-013] Case-Sensitivity File Import Build Blocker

- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [App.jsx](../client/src/App.jsx) (Line 7)
- **Description:** On line 7 of `App.jsx`, the Login page is imported using `./pages/login` instead of `./pages/Login` (capital L). While Windows is case-insensitive (and compiles fine locally), compiling or running builds on case-sensitive Linux build environments (e.g. Vercel, Netlify, Docker) will throw a fatal module compilation crash.
- **Proposed Resolution:** Update the import statement to use `./pages/Login` to maintain exact case correspondence.

#### [BACKLOG-014] Synchrounous SetState inside useEffect (Linter Errors)

- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [BusinessAdvisor.jsx](../client/src/pages/BusinessAdvisor.jsx) (Line 90)
  - [Inventory.jsx](../client/src/pages/Inventory.jsx) (Line 35)
  - [Ledger.jsx](../client/src/pages/Ledger.jsx) (Line 44)
  - [ProductDetails.jsx](../client/src/pages/ProductDetails.jsx) (Line 68)
  - [Products.jsx](../client/src/pages/Products.jsx) (Line 37)
  - [SellerProductDetails.jsx](../client/src/pages/SellerProductDetails.jsx) (Line 45)
- **Description:** Several pages call local fetching or configuration routines inside `useEffect` on component mount, which triggers state changes synchronously. This violates ESLint's `react-hooks/set-state-in-effect` rule, causing build-time linter failures.
- **Proposed Resolution:** Define fetching routines as dependencies wrapped inside `useCallback`, declare them directly inside the `useEffect` closure, or use trigger-key states to coordinate updates.

#### [BACKLOG-015] Monolithic Page UI Components (Decomposability)

- **Priority:** MEDIUM
- **Effort:** L (Large)
- **AFFECTED FILES & SYMBOLS:**
  - [Orders.jsx](../client/src/pages/Orders.jsx) (775 lines)
  - [Dashboard.jsx](../client/src/pages/Dashboard.jsx) (548 lines)
  - [BusinessAdvisor.jsx](../client/src/pages/BusinessAdvisor.jsx) (437 lines)
- **Description:** Pages are constructed as single file components containing nested rendering logic, state management, layouts, search/filter inputs, and modal forms. This violates frontend design practices (KISS / separation of concerns) and impedes reusability and unit testing.
- **Proposed Resolution:** Refactor pages by extracting logic into reusable UI units:
  - Extract charts and stat grids into `/components/dashboard/` (e.g., `FunnelChart`, `StatCard`, `HealthStatus`).
  - Extract order details and actions into `/components/orders/` (e.g., `OrderCard`, `OrderItem`, `IssueReviewForm`).
  - Extract advisor chat transcript list into `/components/advisor/` (e.g., `AdvisorTranscript`, `PromptSelector`).

#### [BACKLOG-016] Hardcoded Axios Base URL

- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [axios.js](../client/src/api/axios.js) (Line 4)
- **Description:** The Axios API client hardcodes the base backend URL as `'http://localhost:5000/api'`. This limits configurability in staging/production environments, and is inconsistent with `aiAdvisor.js`, which reads from environment variables.
- **Proposed Resolution:** Replace the hardcoded string with `import.meta.env.VITE_API_URL || 'http://localhost:5000/api'`.

#### [BACKLOG-017] Hand-Rolled Auth Persistence & Missing Expiry Handling

- **Priority:** LOW
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [authStore.js](../client/src/store/authStore.js)
  - [axios.js](../client/src/api/axios.js)
- **Description:**
  1.  `authStore.js` manages local storage writes and reads manually instead of using Zustand's native `persist` middleware.
  2.  If the backend throws a `401 Unauthorized` (e.g., from an expired JWT token), the client Axios middleware does not intercept or handle it. The user remains authenticated on the frontend UI, but all page interactions fail silently.
- **Proposed Resolution:**
  1.  Refactor `authStore.js` to use Zustand's native `persist` middleware.
  2.  Add an Axios interceptor that captures `401`/`403` status responses, calls the store's `logout()` action, and redirects the user to `/login`.

#### [BACKLOG-018] Missing Cart Store Persistence

- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [cartStore.js](../client/src/store/cartStore.js)
- **Description:** Items added to the shopping cart inside `cartStore` reside purely in-memory. If a user refreshes the page or navigates away, the cart is wiped clean, hurting the customer e-commerce experience.
- **Proposed Resolution:** Apply Zustand's `persist` middleware to synchronize cart state with local storage.

#### [BACKLOG-019] Vercel React Best Practices - Client-Side Performance Fetching Waterfall

- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [ProductDetails.jsx](../client/src/pages/ProductDetails.jsx) (Functions: `useEffect` hooks fetching products and similar recommendations)
- **Description:** The component triggers two independent sequential `useEffect` hooks to fetch product details and similar recommendations. This creates a data loading waterfall on mount, triggering extra rendering cycles and layout shifts.
- **Proposed Resolution:** Combine the independent fetches into a single `useEffect` block utilizing `Promise.all` to fetch products and similar recommendations simultaneously, transitioning loading states together to improve performance and CLS (Cumulative Layout Shift).

#### [BACKLOG-020] Vercel React Best Practices - Redundant useMemo for Simple Primitives

- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [SellerProductDetails.jsx](../client/src/pages/SellerProductDetails.jsx) (Variable: `stockStatus`)
- **Description:** The component wraps a trivial conditional stock check in `useMemo`. This adds dependency tracking and memoization memory overhead for a lightweight operation, violating `rerender-simple-expression-in-memo`.
- **Proposed Resolution:** Remove `useMemo` and calculate the `stockStatus` directly during render.

#### [BACKLOG-021] Folderisation Standard Deviations & Dead Code

- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [Store.jsx](../client/src/pages/Store.jsx) (Dead Code)
  - [App.jsx](../client/src/App.jsx) (Routes & lazy loading)
  - `/src/components/customer` (Empty directory)
  - `/src/components/wholesaler` (Empty directory)
- **Description:**
  1. The project has empty component directories `src/components/customer` and `src/components/wholesaler` because pages are implemented as giant inline monoliths instead of modular components.
  2. Naming structure inconsistencies exist: `/pages/Login.jsx` is imported as `./pages/login` (lowercase) in `App.jsx`, which breaks in case-sensitive production environments.
  3. `Store.jsx` is dead code. It is imported in `App.jsx` but never used in any active routes (rendering is handled by `Storefront.jsx`).
- **Proposed Resolution:** Delete the dead code file `Store.jsx`, correct the import casing in `App.jsx`, and clean up the empty component directories or populate them as components are decoupled.

#### [BACKLOG-022] State Management Issues - Unhandled Errors & Stock Overdrafts

- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [authStore.js](../client/src/store/authStore.js) (Functions: `login`, `register`)
  - [cartStore.js](../client/src/store/cartStore.js) (Function: `addToCart`)
- **Description:**
  1. `authStore.js` fails to clear the `error` state on successful `login` or `register` calls. If a user triggers a login error once and subsequently logs in successfully, the legacy error message is not cleared in the state store.
  2. `cartStore.js` allows customers to add items to their cart exceeding available stock, leading to late checkout validation failures on the backend rather than blockages in the UI.
  3. The dead code page `Store.jsx` implements a local react state cart instead of using the global Zustand `cartStore`.
- **Proposed Resolution:** Update `authStore.js` to set `error: null` on successful logins and registrations. Add a stock level check inside `cartStore.js` (`product.currentStock`) before incrementing the item quantity.

#### [BACKLOG-023] Client-Side Request Lifecycle Memory Leaks & Race Conditions

- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [ProductDetails.jsx](../client/src/pages/ProductDetails.jsx) (Function: `fetchProduct`, `fetchSimilarProducts`)
  - [SellerProductDetails.jsx](../client/src/pages/SellerProductDetails.jsx) (Function: `fetchProduct`)
  - [Storefront.jsx](../client/src/pages/Storefront.jsx) (Function: `fetchMarketplace`)
  - [Inventory.jsx](../client/src/pages/Inventory.jsx) (Function: `fetchData`)
  - [Ledger.jsx](../client/src/pages/Ledger.jsx) (Function: `fetchLedger`)
  - [Products.jsx](../client/src/pages/Products.jsx) (Function: `fetchProducts`)
  - [Dashboard.jsx](../client/src/pages/Dashboard.jsx) (Function: `fetchDashboardData`)
  - [Orders.jsx](../client/src/pages/Orders.jsx) (Function: `fetchOrders`)
- **Description:** The asynchronous data fetching routines inside component `useEffect` hooks lack request cancellation or active-flag checks on unmount. If a user quickly navigates between pages or alters input queries, pending API requests continue executing in the background. Once they resolve, they invoke `setState` on unmounted component instances, preventing garbage collection until network completion. Additionally, this introduces state race conditions where slow legacy queries resolve after newer queries, populating the UI with stale data.
- **Proposed Resolution:** Add an `active` boolean flag within each async `useEffect` hook, toggled to `false` in the cleanup return function. Only execute state changes (`setState`, `setProducts`, etc.) if `active === true`:
  ```javascript
  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const response = await apiClient.get('/endpoint');
        if (active) {
          setData(response.data);
        }
      } catch (err) {
        if (active) setError(err.message);
      }
    };
    fetchData();
    return () => {
      active = false;
    };
  }, [dependency]);
  ```

#### [BACKLOG-024] AI Service Bug: Absolute File Path Disclosure in Citations & Context

- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [citation_service.py](../ai-service/app/services/citation_service.py) (Function: `build_citations`)
  - [prompt_builder.py](../ai-service/app/services/prompt_builder.py) (Function: `build_rag_context_text`)
- **Description:** The citation builder pulls the document `source` property directly from metadata without stripping directory paths. Since the loader stores the raw absolute system path of the PDF files (e.g. `./ai-service/app/docs/business_guide.pdf`), this absolute path is sent directly to the client browser in chat bubbles, exposing internal server directories. It is also injected in LLM prompts, increasing token consumption.
- **Proposed Resolution:** Use `os.path.basename` in `build_citations` and `build_rag_context_text` to extract only the filename (e.g., `business_guide.pdf`) when generating output responses and RAG contexts.

#### [BACKLOG-025] AI Service Performance: Redundant On-the-Fly BM25 Index Compilation

- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [retrieval_service.py](../ai-service/app/services/retrieval_service.py) (Functions: `retrieve_documents`, `get_knowledge_base_state`)
- **Description:** For every user query, the retrieval service invokes `get_knowledge_base_state()`, which retrieves _all_ documents in the database from ChromaDB, tokenizes the entire corpus, and builds a `BM25Okapi` search index from scratch in Python, discarding it immediately after. This triggers high-cost full database reads and expensive CPU/memory overhead on every user message, scaling linearly with the database size.
- **Proposed Resolution:** Implement in-memory caching for the compiled BM25 index and documents array. Build it once on server startup or first search request, and expose a cache invalidation trigger function that `/ingest` invokes to refresh the index when new PDFs are ingested.

#### [BACKLOG-026] AI Service Performance: Hardcoded CPU Devices & Startup Cold-Starts

- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [embedder.py](../ai-service/app/embeddings/embedder.py) (Function: `get_embedder`)
  - [main.py](../ai-service/app/main.py) (Lifespan events)
- **Description:**
  1. The embedding model is hardcoded to run on `cpu` (`model_kwargs={"device": "cpu"}`), preventing optimization on environments equipped with GPUs (CUDA/MPS).
  2. The model weights are loaded dynamically on demand during the first query, leading to a several-second cold-start delay for the initial chatbot or ingestion execution.
- **Proposed Resolution:** Replace the hardcoded `cpu` string with a dynamic check (e.g. using `torch.cuda.is_available()`). Set up a lifespan startup event in FastAPI to warm-call `get_embedder()`, pre-loading model weights before incoming traffic arrives.

#### [BACKLOG-027] Weak Default JWT Secret Key

- **Priority:** HIGH
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [backend/.env](../.env) (Line 2)
- **Description:** The application uses a weak default placeholder value (`your_super_secret_jwt_key_here`) for the `JWT_SECRET` key in the backend environment configuration. If this key is not regenerated, attackers can easily forge JWT signatures and gain unauthorized system permissions.
- **Proposed Resolution:** Replace the placeholder key with a dynamically generated high-entropy random string (e.g., 256-bit key) and write setup documentation instructing developers how to generate a secure secret (e.g., via `openssl rand -base64 32`).

#### [BACKLOG-028] Database Performance: Unbounded Data Loading in Popularity Calculations

- **Priority:** HIGH
- **Effort:** M (Medium)
- **AFFECTED FILES & SYMBOLS:**
  - [popularityService.js](../src/services/popularityService.js) (Functions: `getPopularityScores`, `getPopularProducts`)
- **Description:** The popularity score service fetches _all_ interactions and _all_ order item rows from the database into Node.js heap memory to compute decay scores. As transaction and recommendation logs expand over time, this creates severe database processing bottlenecks, excessive memory utilization, and potential server OOM crashes.
- **Proposed Resolution:** Restructure calculations to query within a rolling time window (e.g., last 30 days) and delegate decay logic and aggregations to PostgreSQL raw queries or Prisma group-by queries, keeping large datasets in-database.

#### [BACKLOG-029] Code Reusability: Redundant Click-Tracking Logic

- **Priority:** LOW
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [Storefront.jsx](../client/src/pages/Storefront.jsx) (Function: `handleProductClick`)
  - [ProductDetails.jsx](../client/src/pages/ProductDetails.jsx) (Function: `handleRecommendationClick`)
- **Description:** Recommendation click-interaction tracking (firing POST calls to `/interactions/recommendation-event` and coordinating navigation redirects) is duplicated across separate page handlers. This violates DRY guidelines.
- **Proposed Resolution:** Extract click-event logging and navigation logic into a single helper utility (e.g., `trackRecommendationClick`) in `src/utils/` to simplify code.

#### [BACKLOG-030] Code Splitting: Missing Rollup Vendor Chunks for Large Libraries

- **Priority:** MEDIUM
- **Effort:** S (Small)
- **AFFECTED FILES & SYMBOLS:**
  - [vite.config.js](../client/vite.config.js)
- **Description:** The Vite configuration has no custom Rollup chunk-splitting setup. Heavy libraries (such as `recharts` and large barrel imports from `lucide-react`) are bundled inside route bundles without manual vendor splitting, leading to layout chunk bloat.
- **Proposed Resolution:** Configure `rollupOptions.output.manualChunks` in `vite.config.js` to split heavy libraries (like `recharts` and `lucide-react`) into standalone vendor chunks to optimize page load times.
