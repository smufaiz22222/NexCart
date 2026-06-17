# NexCart Agent Guardrails

This document defines strict architectural, security, database, and frontend guardrails for autonomous coding agents. These guardrails prevent the reintroduction of issues cataloged in the [Project Backlog](file:///c:/Users/smufa/Desktop/NexCart_updated/docs/backlog.md).

---

## 1. Security & Secrets Guardrails

### 1.1 Do Not Leak Secrets in Logs

- **Rule**: Never print environment variables, API secret keys, credentials, or encryption keys (e.g., `process.env.JWT_SECRET`) to stdout, standard errors, or console logs.
- **Backlog Context**: `[BACKLOG-003] JWT Secret Key Log Leak on Server Startup`
- **Bad Pattern**:
  ```javascript
  console.log('ENV TEST:', process.env.JWT_SECRET);
  ```
- **Good Pattern**: Remove any secret logging statements immediately. If check-statements are needed, log boolean presence only:
  ```javascript
  console.log('JWT_SECRET configured:', !!process.env.JWT_SECRET);
  ```

### 1.2 Enforce Endpoint Rate Limiting

- **Rule**: Public-facing sensitive endpoints (authentication, AI vision/text processing, file ingestion) must have rate limiting configured.
- **Backlog Context**: `[BACKLOG-004] Missing Rate Limiting on Authentication & Scanners`
- **Good Pattern**: Use `express-rate-limit` to restrict calls to registration (`/api/auth/register`), login (`/api/auth/login`), and OCR processing (`/api/khatta/process`).
  ```javascript
  import rateLimit from 'express-rate-limit';
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
  });
  ```

### 1.3 Secure CORS Configuration

- **Rule**: Avoid wildcard CORS configurations (`*`) in production.
- **Backlog Context**: `[BACKLOG-005] Lax CORS Policy Configuration`
- **Good Pattern**: Configure CORS to read allowed origins from environment variables.
  ```javascript
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
    })
  );
  ```

### 1.4 Validate Password Complexity on Backend

- **Rule**: Do not rely on hashing alone. Validate password length and complexity on the backend before executing hashing.
- **Backlog Context**: `[BACKLOG-006] Lack of Password Complexity Validation`
- **Good Pattern**:
  ```javascript
  if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({
      error:
        'Password must be at least 8 characters long and contain uppercase and numeric characters.',
    });
  }
  ```

### 1.5 Secure JWT Lifecycle

- **Rule**: Avoid excessively long token expirations without verification logic. Implement token blacklisting or verification on client logout.
- **Backlog Context**: `[BACKLOG-007] No Token Blacklisting on Logout & Excessive Expiry Duration`, `[BACKLOG-027] Weak Default JWT Secret Key`
- **Good Pattern**: Set access token lifespan to 1 hour, use refresh tokens in `httpOnly` secure cookies, and generate high-entropy random strings for `JWT_SECRET`.

---

## 2. Database & Query Guardrails

### 2.1 Index Foreign Keys

- **Rule**: All foreign keys and frequently queried combination columns must be explicitly indexed.
- **Backlog Context**: `[BACKLOG-008] Unindexed Foreign Keys in PostgreSQL Schema`
- **Good Pattern** (`schema.prisma`):
  ```prisma
  model Product {
    id            String   @id @default(uuid())
    wholesalerId  String
    category      String
    currentStock  Int
    // ...
    @@index([wholesalerId])
    @@index([category])
    @@index([currentStock])
  }
  ```

### 2.2 Avoid N+1 Queries (Batch Database Operations)

- **Rule**: Never run database queries (`findUnique`, `findFirst`, `update`, `create`) inside loops. Fetch data in batch beforehand using array inputs (`in`), then perform matching in memory.
- **Backlog Context**: `[BACKLOG-002] N+1 Query Loop in AI Khatta Save Transactions`, `[BACKLOG-011] Write N+1 Performance Bottle-neck in Transactional Checkout`
- **Bad Pattern**:
  ```javascript
  for (const item of items) {
    const customer = await tx.customer.findFirst({ where: { email: item.email } });
    await tx.ledgerEntry.create({ data: { userId: customer.id, ... } });
  }
  ```
- **Good Pattern**:

  ```javascript
  const emails = items.map(i => i.email);
  const customers = await tx.user.findMany({
    where: { email: { in: emails }, role: 'CUSTOMER' }
  });
  const customerMap = new Map(customers.map(c => [c.email, c]));

  const ledgerEntries = items.map(item => {
    const customer = customerMap.get(item.email);
    return { userId: customer.id, ... };
  });
  await tx.ledgerEntry.createMany({ data: ledgerEntries });
  ```

### 2.3 Delegate Aggregations to the Database

- **Rule**: Never pull entire tables or unbounded rows into memory to perform aggregations, decay scores, or calculations. Use SQL/Prisma aggregations (`groupBy`, `sum`, `avg`) and filter using a rolling time window.
- **Backlog Context**: `[BACKLOG-009] Heavy On-the-Fly Aggregations and Denormalization`, `[BACKLOG-028] Database Performance: Unbounded Data Loading in Popularity Calculations`
- **Good Pattern**: Keep historical queries bounded (e.g. `createdAt: { gte: thirtyDaysAgo }`) and let the database engine sum, group, or average.

---

## 3. Backend & Architecture Guardrails

### 3.1 Strict Controller-Service Separation

- **Rule**: Routes must only handle request mapping, authorization middleware, input validation, and sending responses. All business logic, Prisma calls, calculations, and integrations must reside in controllers or services.
- **Backlog Context**: `[BACKLOG-010] Monolithic Route Files Bypassing Controller Layer`
- **Good Pattern**: Keep route files thin:
  ```javascript
  // routes/statsRoutes.js
  router.get('/summary', authenticate, statsController.getWholesalerSummary);
  ```

### 3.2 Bound In-Memory Caches

- **Rule**: Never use simple unbounded objects/dictionaries for in-memory caching as this leaks memory over time. Use a library that enforces max-size limits and Time-To-Live (TTL) expiration.
- **Backlog Context**: `[BACKLOG-012] Unbounded In-Memory Cache Memory Leak in FastAPI Memory Store`
- **Good Pattern** (Python): Use `cachetools` or a local Redis cache.
  ```python
  from cachetools import TTLCache
  _memory_store = TTLCache(maxsize=1000, ttl=3600)  # Expiry after 1 hour
  ```

---

## 4. React & Frontend Performance Guardrails

### 4.1 Case-Sensitive Imports

- **Rule**: Always match import paths to their filenames exactly, matching uppercase/lowercase characters. Linux build environments (like Vercel) are case-sensitive and will crash if paths do not match.
- **Backlog Context**: `[BACKLOG-013] Case-Sensitivity File Import Build Blocker`
- **Bad Pattern**:
  ```javascript
  import Login from './pages/login'; // Directory contains 'Login.jsx'
  ```
- **Good Pattern**:
  ```javascript
  import Login from './pages/Login';
  ```

### 4.2 Avoid Waterfall Network Requests

- **Rule**: Group independent API calls into a single `Promise.all` instead of invoking them sequentially or using multiple independent, uncoordinated `useEffect` hooks.
- **Backlog Context**: `[BACKLOG-019] Vercel React Best Practices - Client-Side Performance Fetching Waterfall`
- **Good Pattern**:
  ```javascript
  useEffect(() => {
    let active = true;
    const fetchAll = async () => {
      const [productRes, recommendationRes] = await Promise.all([
        apiClient.get(`/products/${id}`),
        apiClient.get(`/recommendations/${id}`),
      ]);
      if (active) {
        setProduct(productRes.data);
        setRecommendations(recommendationRes.data);
      }
    };
    fetchAll();
    return () => {
      active = false;
    };
  }, [id]);
  ```

### 4.3 Request Lifecycle Cancellation (Avoid Memory Leaks)

- **Rule**: Always check an `active` flag in the cleanup function of `useEffect` to prevent calling `setState` on unmounted component instances. This prevents memory leaks and query race conditions.
- **Backlog Context**: `[BACKLOG-023] Client-Side Request Lifecycle Memory Leaks & Race Conditions`
- **Good Pattern**:
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

### 4.4 Avoid Redundant useMemo

- **Rule**: Do not wrap lightweight primitive operations or simple conditional expressions in `useMemo`. Memoization has runtime tracking overhead.
- **Backlog Context**: `[BACKLOG-020] Vercel React Best Practices - Redundant useMemo for Simple Primitives`
- **Good Pattern**: Calculate status/primitives directly on render.
  ```javascript
  const stockStatus = currentStock > 0 ? 'In Stock' : 'Out of Stock';
  ```

### 4.5 Component Decomposability

- **Rule**: Pages must not be monolithic blocks of 500+ lines. Decouple page logic into modular components in `/components/`.
- **Backlog Context**: `[BACKLOG-015] Monolithic Page UI Components (Decomposability)`

### 4.6 Fallback API URL Configs

- **Rule**: Never hardcode API host names or local URLs. Always fall back to environment variables.
- **Backlog Context**: `[BACKLOG-016] Hardcoded Axios Base URL`
- **Good Pattern**:
  ```javascript
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  ```

### 4.7 Synchronize State and Handle Expirations

- **Rule**: When using stores, clear old error states on successful operations, validate input conditions (e.g., product stock limits) client-side before updating global stores, and automatically log users out when receiving `401 Unauthorized` responses.
- **Backlog Context**: `[BACKLOG-017] Hand-Rolled Auth Persistence & Missing Expiry Handling`, `[BACKLOG-018] Missing Cart Store Persistence`, `[BACKLOG-022] State Management Issues - Unhandled Errors & Stock Overdrafts`

---

## 5. AI Service & LLM/RAG Guardrails

### 5.1 Do Not Disclose Absolute Server File Paths

- **Rule**: Never send full absolute system paths to client browsers or inject them into prompts. Use directory-agnostic paths or strip them down to the base filename.
- **Backlog Context**: `[BACKLOG-024] AI Service Bug: Absolute File Path Disclosure in Citations & Context`
- **Good Pattern** (Python):
  ```python
  import os
  clean_filename = os.path.basename(absolute_pdf_path)
  ```

### 5.2 Cache Retrieval Index Configurations

- **Rule**: Avoid tokenizing files, building matrices, or regenerating search indexes (e.g., BM25) on every query. Cache index configurations and invalidate the cache only on new file ingestions.
- **Backlog Context**: `[BACKLOG-025] AI Service Performance: Redundant On-the-Fly BM25 Index Compilation`

### 5.3 Dynamic Device Execution & Warmups

- **Rule**: Avoid hardcoding device execution limits (e.g., always CPU). Dynamically inspect capabilities (CUDA/MPS/CPU) and utilize lifespan startup events to warm-call deep learning models.
- **Backlog Context**: `[BACKLOG-026] AI Service Performance: Hardcoded CPU Devices & Startup Cold-Starts`
