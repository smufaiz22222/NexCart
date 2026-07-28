# NexCart — Comprehensive Final Year Project Report

## AI-Powered B2B & B2C E-Commerce Platform with Hybrid Recommendations, Vision Ledger Digitization, and RAG Business Advisory

---

**Submitted by:** [Your Name]  
**Registration No:** [Your Reg No]  
**Department:** [Your Department]  
**Supervisor:** [Supervisor Name]  
**University:** [University Name]  
**Date:** June 2026

---

## Table of Contents

1. [Introduction](#chapter-1-introduction)
2. [Literature Review & Technology Stack](#chapter-2-literature-review--technology-stack)
3. [System Requirements](#chapter-3-system-requirements)
4. [System Architecture & Design](#chapter-4-system-architecture--design)
5. [Database Schema & Data Model](#chapter-5-database-schema--data-model)
6. [Backend Implementation — Module-Level Documentation](#chapter-6-backend-implementation)
7. [AI Engines — Detailed Implementation](#chapter-7-ai-engines)
8. [Frontend Implementation](#chapter-8-frontend-implementation)
9. [B2B Wholesale Commerce Module](#chapter-9-b2b-wholesale-commerce-module)
10. [Subscription & Billing System](#chapter-10-subscription--billing-system)
11. [Order Lifecycle, Returns & Dispute Resolution](#chapter-11-order-lifecycle-returns--dispute-resolution)
12. [Security, Middleware & Rate Limiting](#chapter-12-security-middleware--rate-limiting)
13. [Testing, Evaluation & Results](#chapter-13-testing-evaluation--results)
14. [Deployment & DevOps](#chapter-14-deployment--devops)
15. [Conclusion & Future Scope](#chapter-15-conclusion--future-scope)
16. [References](#references)
17. [Appendix A: Complete API Endpoint Reference](#appendix-a-complete-api-endpoint-reference)
18. [Appendix B: Viva Voce Preparation](#appendix-b-viva-voce-preparation)

---

# Chapter 1: Introduction

## 1.1 Project Overview & Motivation

The digital commerce landscape has undergone rapid transformation over the past two decades. While B2C retail platforms have advanced significantly with personalization engines, headless checkout pipelines, and real-time behavioral analytics, the B2B wholesale sector remains largely underserved. Wholesalers form the backbone of the supply chain, supplying inventory to SMEs, local retail stores, and independent merchants.

NexCart addresses critical gaps in wholesale commerce through an AI-powered platform that combines:

1. **Hybrid Recommendation Engine** — Merging TF-IDF content similarity, item-based collaborative filtering, and exponential time-decay popularity scoring to deliver personalized storefronts with sub-100ms response times.
2. **AI Khatta Digitizer** — Leveraging Google Gemini Vision models to parse photographs of handwritten billing books into structured JSON transaction records, atomically writing them into a PostgreSQL ledger.
3. **AI Business Advisor** — A Retrieval-Augmented Generation (RAG) chatbot built on FastAPI, LangChain, ChromaDB, and sentence-transformers that retrieves contextual business guides and generates grounded, actionable advice for wholesalers.
4. **B2B Commerce Module** — A full RFQ (Request for Quotation) negotiation system, volume-based price tiers, and credit limit management for wholesale buyers.
5. **Subscription & Billing System** — A multi-tier SaaS model with free trials, Razorpay-powered plan purchases, coupon-based activation, and feature-gated access control.

## 1.2 Problem Statement

### 1.2.1 Credit Accounting Friction

Traditional B2B credit bookkeeping relies on physical paper ledgers ("Khatta books"), creating:

- Physical vulnerability to damage and loss
- Mathematical errors in manual calculations
- No remote customer access to balance inquiries
- Zero business intelligence extraction capability

### 1.2.2 Recommendation System Cold-Start

- Collaborative filtering fails for new users/products with no interaction history
- Content-based filtering over-specializes, failing to surface trending items
- Real-time similarity calculations create database lock contention under load

### 1.2.3 Wholesaler Operational Scaling

- High consulting costs for strategy guidance
- Hallucination risk in ungrounded LLM responses
- Information overload from lengthy PDF business manuals

### 1.2.4 B2B Commerce Gaps

- No standardized RFQ negotiation workflow between buyers and sellers
- Manual credit limit tracking across wholesale relationships
- Absence of volume-based pricing automation

## 1.3 Project Goals & Objectives

| #   | Objective                             | Implementation                                                  |
| --- | ------------------------------------- | --------------------------------------------------------------- |
| 1   | Build a decoupled multi-tier platform | React 19 SPA + Express.js API + FastAPI AI Service + PostgreSQL |
| 2   | Deploy a latency-safe recommender     | Pre-computed hybrid recommendations with offline job pipeline   |
| 3   | Build a Vision-based ledger scanner   | Gemini Vision API + atomic Prisma transactions                  |
| 4   | Create a verified RAG chatbot         | BM25+ChromaDB hybrid retrieval with 0.55 confidence threshold   |
| 5   | Ensure transactional integrity        | Atomic checkout, payment idempotency, idempotent ledger entries |
| 6   | Implement B2B commerce                | RFQ negotiation, price tiers, credit limits                     |
| 7   | Build a SaaS subscription system      | Free trials, Razorpay billing, feature-gated access             |

## 1.4 Report Organization

This report provides exhaustive documentation of every module, function, and service in the NexCart codebase across 15 chapters covering architecture, database design, backend services, AI engines, frontend implementation, security, testing, and deployment.

---

# Chapter 2: Literature Review & Technology Stack

## 2.1 E-Commerce Architectural Patterns

Modern e-commerce systems employ decoupled, multi-tier architectures separating client interfaces from API gateways and AI processing layers. NexCart follows this pattern with three independently deployable services communicating over REST/HTTP.

## 2.2 Recommendation System Theory

### 2.2.1 Content-Based Filtering (TF-IDF + Cosine Similarity)

- **TF (Term Frequency):** `tf(t,d) = count(t) / total_terms(d)`
- **IDF (Inverse Document Frequency):** `idf(t) = log((N+1) / (df(t)+1)) + 1`
- **Cosine Similarity:** `sim(A,B) = (A·B) / (||A|| × ||B||)`

### 2.2.2 Collaborative Filtering (Item-Based)

Computes similarity between item interaction vectors across users using cosine similarity. Products frequently purchased/viewed together receive higher collaborative scores.

### 2.2.3 Popularity with Exponential Decay

`PopularityScore = Σ(ActionWeight × Quantity) × 0.5^(AgeDays / HalfLife)`

Action weights: purchase=7, review=5, cart=4, wishlist=3, view=1. HalfLife=14 days.

## 2.3 Retrieval-Augmented Generation (RAG)

RAG splits documents into chunks, generates vector embeddings, indexes them in a vector database, and at runtime matches user queries via cosine similarity to extract relevant passages that are prepended to LLM prompts—grounding responses in verified documentation.

## 2.4 Hybrid Retrieval (BM25 + Semantic Search)

NexCart's AI advisor uses a dual-retrieval strategy:

- **Semantic Search (70% weight):** ChromaDB vector similarity using sentence-transformers/all-MiniLM-L6-v2
- **Keyword Search (30% weight):** BM25Okapi term-frequency matching for exact keyword hits

This hybrid approach ensures both conceptually similar and keyword-matching content is retrieved.

## 2.5 Technology Stack

| Layer            | Technology            | Version                      | Purpose                       |
| ---------------- | --------------------- | ---------------------------- | ----------------------------- |
| Frontend         | React                 | v19                          | Component-based SPA           |
| State Management | Zustand               | v5                           | Lightweight global state      |
| Styling          | Tailwind CSS          | v4                           | Utility-first CSS             |
| Backend API      | Express.js            | v5                           | REST API gateway              |
| ORM              | Prisma                | v6 (7.8.0 client)            | Type-safe database access     |
| Database         | PostgreSQL            | Latest                       | Relational data storage       |
| AI Service       | FastAPI               | Latest                       | Python async web framework    |
| RAG Pipeline     | LangChain             | Latest                       | LLM orchestration             |
| Vector Store     | ChromaDB              | Latest                       | Embedding storage & search    |
| Embeddings       | sentence-transformers | all-MiniLM-L6-v2             | Text-to-vector conversion     |
| LLM Provider     | Google Gemini         | gemini-1.5-flash / 2.5-flash | Text generation & vision      |
| Payments         | Razorpay              | v2.9.6                       | Payment gateway               |
| Security         | Helmet, JWT, bcrypt   | Latest                       | HTTP security & auth          |
| Rate Limiting    | express-rate-limit    | v8.5.2                       | DDoS protection               |
| Build Tool       | Vite                  | Latest                       | Frontend bundling             |
| Package Manager  | pnpm                  | Latest                       | Monorepo workspace management |

---

# Chapter 3: System Requirements

## 3.1 Functional Requirements

### 3.1.1 Customer (B2C) Requirements

- User registration with email validation and password strength enforcement (8+ chars, uppercase, lowercase, number, special char)
- JWT-based session management with token blacklisting on logout
- Product catalog browsing with category filtering and search
- Personalized recommendation carousels (trending, personalized, similar products)
- Shopping cart with size selection, stock validation, and recommendation attribution
- Multi-seller checkout supporting COD, Prepaid (Razorpay), and Ledger Credit payment methods
- Order tracking with full lifecycle visibility
- Item-level cancellation with automatic refund processing
- Return request workflow (request → approve/reject → receive → refund)
- Dispute resolution workflow for post-delivery issues
- Shipping address management (CRUD, max 10 addresses, pincode lookup via PostalPincode API)
- Product reviews and ratings (1-5 stars)
- Personal ledger balance viewing

### 3.1.2 Wholesaler Requirements

- Business registration with onboarding approval workflow (APPLIED → UNDER_REVIEW → APPROVED → ACTIVE)
- Product CRUD with real-time recommendation index updates
- Stock adjustments with audit logging (SALE, REFUND, OCR_UPDATE, MANUAL_ADJUSTMENT, CANCELLATION, CUSTOMER_RETURN)
- Credit ledger management per customer
- AI Khatta OCR receipt scanner (Gemini Vision)
- AI Business Advisor chatbot console
- Order management (status updates, return approval/rejection, dispute resolution)
- Sales analytics dashboard (revenue, profit, time-series charts, top products)
- Advanced analytics overview (churn risk, slow-moving inventory, SKU performance, repeat customer rates)
- Subscription plan management (trial activation, paid plan purchase, billing history)
- B2B buyer management (credit limits, outstanding balances)
- RFQ negotiation (accept/reject/counter-offer)
- Volume-based price tier configuration

### 3.1.3 Super Admin Requirements

- Global platform statistics dashboard
- Wholesaler directory with revenue, inventory, and subscription visibility
- Pending wholesaler application review (approve/reject)
- Wholesaler lifecycle management (suspend, reactivate)
- Recommendation system analytics (CTR, conversion rates, catalog coverage)
- Offline recommendation benchmarking (Precision@K, Recall@K, MAP@K, NDCG@K)
- System maintenance (clear logs, reset evaluations, reset analytics)
- Subscription plan catalog management
- Coupon creation and management
- B2B business application review

## 3.2 Non-Functional Requirements

| Requirement         | Target                     | Implementation                                                 |
| ------------------- | -------------------------- | -------------------------------------------------------------- |
| API Response Time   | <100ms for recommendations | Pre-computed similarity matrices stored in DB                  |
| RAG Response Time   | <3s for advisor queries    | Cached BM25 index + optimized ChromaDB retrieval               |
| Concurrency Safety  | No overselling             | Atomic conditional stock decrements with `FOR UPDATE` locks    |
| Payment Idempotency | No duplicate orders        | Unique constraints on payment references                       |
| Data Isolation      | User privacy               | JWT-enforced ownership checks on all queries                   |
| Rate Limiting       | DDoS protection            | 100 req/min global, 5 req/min auth, 5 req/min AI scans         |
| Security            | Industry-standard          | Helmet headers, bcrypt hashing, JWT validation, CORS whitelist |

---

# Chapter 4: System Architecture & Design

## 4.1 Three-Tier Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (Port 5173)                       │
│  React 19 SPA + Zustand Stores + Tailwind CSS + Vite            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP REST / JWT
┌──────────────────────────▼──────────────────────────────────────┐
│                  SERVICE LAYER (Port 5000)                        │
│  Express.js v5 + Prisma ORM + Razorpay + Gemini Vision          │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌────────────────┐      │
│  │ Auth    │ │ Products │ │ Orders  │ │ Recommendations │      │
│  │ Cart    │ │ Ledger   │ │ Khatta  │ │ Subscriptions   │      │
│  │ B2B     │ │ Stats    │ │ Disputes│ │ Webhooks        │      │
│  └─────────┘ └──────────┘ └─────────┘ └────────────────┘      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Prisma Client
┌──────────────────────────▼──────────────────────────────────────┐
│                  DATABASE LAYER                                    │
│  PostgreSQL + 30 Tables + 20 Enums + Prisma Migrations           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  AI SERVICE LAYER (Port 8000)                     │
│  FastAPI + LangChain + ChromaDB + sentence-transformers          │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐      │
│  │ Chat Route   │ │ Ingest Route │ │ History Route       │      │
│  │ Advisor Svc  │ │ Retrieval    │ │ Domain Filter       │      │
│  │ LLM Provider │ │ BM25 Cache   │ │ Question Classifier │      │
│  └──────────────┘ └──────────────┘ └────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## 4.2 Express.js Application Bootstrap (`src/app.js`)

The Express application initializes with the following middleware chain:

1. **Helmet** — Sets secure HTTP headers (XSS protection, HSTS, CSP)
2. **CORS** — Whitelist-based origin checking from `ALLOWED_ORIGINS` environment variable
3. **Global Rate Limiter** — 100 requests/minute per IP
4. **Raw Body Parser** — For Razorpay webhook signature verification (before JSON parsing)
5. **JSON Body Parser** — 50MB limit for image payloads (AI Khatta)
6. **URL-encoded Parser** — 50MB limit

### Route Registration Order:

```
/api/health           → Health check (DB connectivity test)
/api/auth             → Authentication (register, login, logout, profile)
/api/products         → Product CRUD + marketplace
/api/inventory        → Stock adjustments + audit logs
/api/orders           → Checkout, returns, disputes, cancellations
/api/cart             → Cart CRUD
/api/addresses        → Shipping address management
/api/ledger           → Credit ledger entries
/api/admin            → Super admin operations
/api/subscriptions    → Billing & subscription management
/api/khatta           → AI OCR receipt scanning
/api/stats            → Wholesaler analytics
/api/interactions     → Recommendation event tracking
/api/recommendations  → Recommendation feeds & analytics
/api/b2b              → B2B onboarding, RFQs, price tiers
```

## 4.3 Server Entry Point (`src/index.js`)

Minimal entry that imports the configured Express app and starts listening on `PORT` (default: 5000).

## 4.4 Database Configuration (`src/config/db.js`)

Uses Prisma Client with a **PostgreSQL adapter** (`@prisma/adapter-pg`) connected via a `pg.Pool`. Implements a **Prisma Client Extension** that automatically updates cached credit balances in `WholesalerCreditLimit` table whenever any `LedgerEntry` CRUD operation occurs. This extension intercepts `create`, `createMany`, `update`, `updateMany`, `upsert`, `delete`, and `deleteMany` operations on `LedgerEntry` and recalculates aggregate balances per wholesaler-buyer pair.

---

# Chapter 5: Database Schema & Data Model

## 5.1 Schema Overview

The NexCart database is managed through Prisma ORM with PostgreSQL. The schema comprises **30+ models** and **20+ enums** organized into the following domain groups:

### 5.1.1 Identity & Access Models

| Model              | Purpose                        | Key Fields                                                                                                |
| ------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `User`             | Core identity for all users    | `id`, `name`, `email` (unique), `password` (bcrypt), `role` (CUSTOMER/WHOLESALER/SUPER_ADMIN)             |
| `Wholesaler`       | Business profile for sellers   | `userId` (1:1 with User), `businessName`, `businessPhone`, `taxId`, `businessAddress`, `onboardingStatus` |
| `BusinessProfile`  | B2B buyer verification profile | `userId` (1:1 with User), `companyName`, `taxId`, `verification` status                                   |
| `BlacklistedToken` | JWT revocation store           | `token` (unique), `expiresAt`                                                                             |

### 5.1.2 Product & Inventory Models

| Model              | Purpose                  | Key Fields                                                                                                                     |
| ------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `Product`          | Item catalog             | `wholesalerId`, `name`, `price`, `costPrice`, `currentStock`, `minStock`, `category`, `sizes[]`, `isB2BEnabled`, `minOrderQty` |
| `InventoryLog`     | Stock change audit trail | `productId`, `changeAmount`, `reason` (enum: SALE/REFUND/OCR_UPDATE/MANUAL_ADJUSTMENT/CANCELLATION/CUSTOMER_RETURN)            |
| `ProductPriceTier` | Volume-based pricing     | `productId`, `minQuantity`, `unitPrice`                                                                                        |
| `Review`           | Customer product ratings | `productId`, `userId`, `rating` (1-5), `comment`                                                                               |

### 5.1.3 Commerce & Order Models

| Model                    | Purpose                          | Key Fields                                                                                                                                       |
| ------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Cart`                   | Per-user shopping cart           | `userId` (unique 1:1)                                                                                                                            |
| `CartItem`               | Cart line items                  | `cartId`, `productId`, `quantity`, `selectedSize`, `recommendationId`, `recommendationSource`                                                    |
| `Order`                  | Checkout session record          | `sellerId`, `buyerId`, `status`, `paymentMethod`, `paymentStatus`, `paymentCaptureStatus`, `totalAmount`, `shippingAddress`, `razorpayPaymentId` |
| `OrderItem`              | Items within an order            | `orderId`, `productId`, `quantity`, `unitPriceAtPurchase`, `subtotalAtPurchase`, `status` (ACTIVE/CANCELLED), `returnStatus`, `refundStatus`     |
| `PrepaidCheckoutSession` | Razorpay order staging           | `buyerId`, `razorpayOrderId` (unique), `payload` (JSON), `paymentStatus`, `createdOrderIds[]`                                                    |
| `Invoice`                | Generated invoice per order      | `wholesalerId`, `orderId` (unique 1:1), `amount`                                                                                                 |
| `OrderAdjustment`        | Return/refund amount adjustments | `orderId`, `orderItemId`, `type` (RETURN), `amount`, `referenceKey` (unique)                                                                     |
| `ShippingAddress`        | Saved delivery addresses         | `userId`, `fullName`, `phone`, `addressLine1/2`, `city`, `state`, `postalCode`, `isDefault`                                                      |

### 5.1.4 Financial & Ledger Models

| Model                   | Purpose                       | Key Fields                                                                                               |
| ----------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| `LedgerEntry`           | Credit/debit transaction log  | `wholesalerId`, `userId`, `orderId`, `amount`, `description`, `source` (enum), `idempotencyKey` (unique) |
| `WholesalerCreditLimit` | Cached balance + credit limit | `wholesalerId`, `buyerId` (composite unique), `creditLimit` (default 50000), `balance` (auto-computed)   |

### 5.1.5 Subscription & Billing Models

| Model                    | Purpose                                  | Key Fields                                                                                            |
| ------------------------ | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `SubscriptionPlan`       | Available plans (TRIAL/STANDARD/PREMIUM) | `code` (unique), `price`, `features` (JSON: analytics, recommendations, advisor, khatta)              |
| `WholesalerSubscription` | Active subscription instances            | `wholesalerId`, `planId`, `status`, `durationMonths`, `purchaseMethod`, `currentPeriodEnd`            |
| `SubscriptionPayment`    | Payment transaction records              | `wholesalerId`, `planId`, `razorpayOrderId`, `baseAmount`, `discountPercent`, `finalAmount`, `status` |
| `Coupon`                 | Promotional activation codes             | `code` (unique), `planId`, `durationDays`, `expiryDate`, `isUsed`, `usedById`                         |

### 5.1.6 Dispute Resolution Models

| Model                 | Purpose                       | Key Fields                                                                                                      |
| --------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `Dispute`             | Buyer-initiated item disputes | `orderId`, `orderItemId`, `buyerId`, `sellerId`, `status` (OPEN/UNDER_REVIEW/RESOLVED), `reason`, `description` |
| `DisputeResolution`   | Final resolution record       | `disputeId` (1:1), `resolvedByUserId`, `resolutionType` (APPROVE/REJECT/PARTIAL_REFUND), `resolutionAmount`     |
| `DisputeEvidence`     | Supporting URLs               | `disputeId`, `url`                                                                                              |
| `DisputeInternalNote` | Seller-private notes          | `disputeId`, `authorId`, `note`                                                                                 |
| `DisputeEvent`        | Timeline audit entries        | `disputeId`, `type` (OPENED/UNDER_REVIEW/NOTE_ADDED/etc.), `performedByUserId`                                  |

### 5.1.7 Recommendation & Analytics Models

| Model                            | Purpose                                          | Key Fields                                                                                                     |
| -------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `ProductFeature`                 | TF-IDF vectors per product                       | `productId` (PK), `textCorpus`, `tfidfVector` (JSON), `version`                                                |
| `ProductSimilarity`              | Pre-computed similarity pairs                    | `productId`, `similarProductId`, `method` (CONTENT/COLLABORATIVE), `score`, `rank`                             |
| `RecommendationInteraction`      | User behavior events                             | `userId`, `productId`, `action` (view/wishlist/cart/purchase/review), `quantity`, `source`, `recommendationId` |
| `RecommendationLog`              | Rendered recommendation impressions              | `userId`, `surface`, `algorithm`, `productIds` (JSON), `isEvaluation`                                          |
| `RecommendationEvent`            | Funnel tracking (impression→click→cart→purchase) | `recommendationLogId`, `productId`, `eventType`                                                                |
| `RecommendationEvaluationReport` | Offline benchmark results                        | `k`, `metrics` (JSON), `reportType`                                                                            |

### 5.1.8 B2B Commerce Models

| Model        | Purpose                           | Key Fields                                                                                                                          |
| ------------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `Rfq`        | Request for Quotation negotiation | `buyerId`, `sellerId`, `productId`, `quantity`, `targetPrice`, `counterPrice`, `status` (PENDING/ACCEPTED/REJECTED/COUNTER_OFFERED) |
| `OrderIssue` | Generic order complaints          | `orderId`, `orderItemId`, `type` (RETURN/REFUND/DISPUTE), `status`, `preferredResolution`                                           |

## 5.2 Key Database Design Patterns

### 5.2.1 Automatic Balance Caching (Prisma Extension)

Every `LedgerEntry` mutation triggers an automatic balance recalculation:

```javascript
// db.js Prisma Extension intercepts all LedgerEntry operations
async create({ args, query }) {
  const result = await query(args);
  await updateCachedBalance(client, result.wholesalerId, result.userId);
  return result;
}
```

This aggregates `SUM(amount)` per wholesaler-buyer pair and upserts into `WholesalerCreditLimit.balance`.

### 5.2.2 Idempotency Keys

Critical financial operations use unique constraint fields to prevent duplicates:

- `LedgerEntry.idempotencyKey`: e.g., `order-auto-payment:{orderId}`
- `OrderAdjustment.referenceKey`: e.g., `return-charge:{itemId}`
- `PrepaidCheckoutSession.razorpayOrderId`: Prevents double-processing

### 5.2.3 Composite Unique Constraints

- `CartItem`: `[cartId, productId, selectedSize]` — one entry per product+size per cart
- `ProductSimilarity`: `[productId, similarProductId, method]` — one score per pair per algorithm
- `WholesalerCreditLimit`: `[wholesalerId, buyerId]` — one limit record per relationship
- `DisputeEvidence`: `[disputeId, url]` — no duplicate evidence URLs

### 5.2.4 Comprehensive Indexing Strategy

The schema employs 50+ database indexes on:

- Foreign keys for join performance
- Status fields for filtered queries
- Timestamp fields for time-range queries
- Composite indexes for common multi-column lookups (e.g., `[productId, action, createdAt]`)

---

# Chapter 6: Backend Implementation — Module-Level Documentation

## 6.1 Controllers (15 files)

### 6.1.1 `authController.js` — Authentication & Session Management

| Function       | HTTP                    | Description                                                                                                                                                                                                                  |
| -------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `register()`   | POST /api/auth/register | Validates payload (name, email, password strength, role). Hashes password with bcrypt (10 rounds). Creates User + nested Wholesaler profile for seller registrations. Returns application-submitted message for wholesalers. |
| `login()`      | POST /api/auth/login    | Case-insensitive email lookup. Compares bcrypt hash. Signs JWT (1h expiry) with `{userId, role, wholesalerId}`. Returns full user profile, subscription summary, feature access flags, and trial state.                      |
| `getProfile()` | GET /api/auth/profile   | Fetches user with wholesaler profile and subscription chain. Returns normalized access summary.                                                                                                                              |
| `logout()`     | POST /api/auth/logout   | Decodes JWT, upserts token into `BlacklistedToken` table with expiry time.                                                                                                                                                   |

### 6.1.2 `productController.js` — Product Catalog Management

| Function                   | Description                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createProduct()`          | Normalizes input (name, SKU, price, costPrice, stock). Creates product for authenticated wholesaler. Triggers async content recommendation index update.           |
| `getProducts()`            | Lists all products for the authenticated wholesaler, ordered by creation date.                                                                                     |
| `getMarketplaceProducts()` | Public listing of all in-stock products with wholesaler name, reviews. Decorates with computed `ratingAverage`, `reviewCount`, `originalPrice`, `discountPercent`. |
| `getProductById()`         | Fetches single product with reviews, price tiers. Scopes to wholesaler if accessed by seller role.                                                                 |
| `updateProduct()`          | Updates product fields. Logs stock changes to `InventoryLog` if quantity differs. Triggers recommendation index refresh.                                           |
| `addReview()`              | Creates customer review (rating 1-5, optional comment).                                                                                                            |

### 6.1.3 `orderController.js` — Order Lifecycle (Largest Controller ~1400 lines)

| Function                    | Description                                                                                                                                                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkout()`                | COD/Ledger Credit checkout. Validates address, loads cart, groups items by seller, validates B2B credit limits (for LEDGER_CREDIT), creates orders per seller with atomic stock decrement, generates invoices, creates ledger entries, clears cart. |
| `createPrepaidOrder()`      | Initiates Razorpay payment flow. Validates cart, computes totals, creates Razorpay order, stores `PrepaidCheckoutSession` with full payload.                                                                                                        |
| `verifyPrepaidOrder()`      | Verifies HMAC-SHA256 Razorpay signature. Idempotency check on session. Creates orders from stored payload on success.                                                                                                                               |
| `getOrders()`               | Returns orders decorated with return financials and dispute data. Scopes by role (buyer sees own orders, wholesaler sees orders placed with them).                                                                                                  |
| `updateOrderStatus()`       | Wholesaler updates order status. On DELIVERED: sets return eligibility window, auto-settles COD payments via idempotent ledger entry.                                                                                                               |
| `cancelOrderItem()`         | Customer cancels item (only PENDING/PROCESSING). Restores stock, creates inventory log, adjusts ledger, processes Razorpay refund for prepaid.                                                                                                      |
| `retryOrderItemRefund()`    | Retries failed Razorpay refunds for cancelled prepaid items.                                                                                                                                                                                        |
| `requestReturn()`           | Customer requests return (7-day window). Validates eligibility, sets `REQUESTED` status.                                                                                                                                                            |
| `approveReturn()`           | Wholesaler approves return. Calculates refund snapshot amount.                                                                                                                                                                                      |
| `rejectReturn()`            | Wholesaler rejects return with reason.                                                                                                                                                                                                              |
| `receiveReturn()`           | Wholesaler marks return item as physically received. Restores stock, creates inventory log, processes refund.                                                                                                                                       |
| `retryReturnRefund()`       | Retries failed Razorpay refunds for returned items.                                                                                                                                                                                                 |
| `createItemDispute()`       | Customer opens dispute on a delivered item. Rate-limited (5 per 24h).                                                                                                                                                                               |
| `updateDisputeStatus()`     | Wholesaler moves dispute to UNDER_REVIEW.                                                                                                                                                                                                           |
| `resolveOrderItemDispute()` | Wholesaler resolves dispute (APPROVE/REJECT/PARTIAL_REFUND). Processes gateway refund for prepaid.                                                                                                                                                  |
| `createDisputeSellerNote()` | Wholesaler adds private internal notes to dispute.                                                                                                                                                                                                  |
| `createOrderIssue()`        | Generic issue creation (refund type only; returns and disputes use dedicated flows).                                                                                                                                                                |
| `updateOrderIssue()`        | Wholesaler reviews issue. Applies resolution side effects (restock, refund status updates).                                                                                                                                                         |

### 6.1.4 `cartController.js` — Shopping Cart Operations

| Function           | Description                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `getCart()`        | Returns hydrated cart with B2B pricing (RFQ prices → tier prices → retail price fallback), line totals, subtotals. |
| `addCartItem()`    | Validates quantity, stock, size. Resolves recommendation attribution. Upserts cart item (increment if exists).     |
| `updateCartItem()` | Updates quantity for existing cart item with stock validation.                                                     |
| `removeCartItem()` | Deletes single cart item.                                                                                          |
| `clearCart()`      | Removes all items from cart.                                                                                       |

### 6.1.5 `inventoryController.js` — Stock Management

| Function             | Description                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `adjustStock()`      | Atomically increments/decrements product stock within a Prisma transaction. Creates audit `InventoryLog` entry. |
| `getInventoryLogs()` | Lists inventory change history for wholesaler, optionally filtered by product.                                  |

### 6.1.6 `ledgerController.js` — Credit Bookkeeping

| Function                | Description                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `recordPayment()`       | Wholesaler manually records a customer payment (positive ledger entry).                |
| `getCustomerLedger()`   | Returns all entries + cached balance for a specific customer of the wholesaler.        |
| `getAllLedgerEntries()` | Lists all ledger entries across all customers for the wholesaler.                      |
| `getMyLedger()`         | Customer views their own ledger entries and aggregated balance across all wholesalers. |

### 6.1.7 `khattaController.js` — AI Vision OCR

| Function               | Description                                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `processKhattaImage()` | Accepts base64 image. Calls Gemini 2.5 Flash with extraction prompt. Returns parsed JSON array of `{customerEmail, amount, notes, isTotal}`. |
| `saveKhattaEntries()`  | Validates extracted entries against existing customer emails. Creates ledger entries atomically within a Prisma transaction.                 |

### 6.1.8 `statsController.js` — Wholesaler Analytics

| Function                 | Description                                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `getWholesalerSummary()` | Computes total debt and total collection from ledger entries.                                                                                 |
| `getAdvisorContext()`    | Generates business metrics (monthly sales, low stock count, unsold inventory, top category, repeat customer rate) passed to AI Advisor.       |
| `getAdvancedSummary()`   | Time-series revenue/profit charts, top products by units sold. Supports daily/monthly/yearly timeframes.                                      |
| `getAnalyticsOverview()` | Comprehensive analytics: headline KPIs, sales trends, top SKUs, slow-moving inventory, customer insights, churn risk scoring, CLV estimation. |

### 6.1.9 `recommendationController.js` — Recommendation API

| Function                          | Description                                                                                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getSimilarProducts()`            | Returns hybrid recommendations for a specific product (content + collaborative + popularity). Creates `RecommendationLog` for attribution tracking. |
| `getUserRecommendations()`        | Personalized feed based on user's recent interaction history.                                                                                       |
| `getPopularRecommendations()`     | Trending/all-time popular products with time-decay scoring.                                                                                         |
| `getRecommendationAnalytics()`    | Full funnel metrics: CTR, cart rate, conversion rate, coverage, most viewed/purchased, top converting recommendations.                              |
| `getRecommendationEvaluation()`   | Runs leave-one-out evaluation. Computes Precision@K, Recall@K, MAP@K, NDCG@K, HitRate@K, Coverage, Diversity.                                       |
| `getRecommendationHealth()`       | System health summary for recommendation pipeline.                                                                                                  |
| `clearRecommendationLogs()`       | Admin maintenance: clears all recommendation logs and events.                                                                                       |
| `resetRecommendationEvaluation()` | Deletes all evaluation reports.                                                                                                                     |
| `resetRecommendationAnalytics()`  | Clears analytics data for fresh start.                                                                                                              |

### 6.1.10 `interactionController.js` — Behavioral Event Tracking

| Function                       | Description                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `createInteraction()`          | Logs user interaction (view/wishlist/cart/purchase/review) with deduplication (30-min view window). |
| `createRecommendationEvent()`  | Logs single funnel event (impression/click/cart/purchase) with attribution validation.              |
| `createRecommendationEvents()` | Batch logs multiple recommendation events with deduplication.                                       |

### 6.1.11 `addressController.js` — Shipping Address Management

| Function              | Description                                                                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getAddresses()`      | Lists all saved addresses for customer, ordered by default first.                                                                                  |
| `createAddress()`     | Validates phone (Indian mobile), postal code (6 digits), resolves pincode via PostalPincode API, checks for duplicates, enforces 10-address limit. |
| `updateAddress()`     | Updates existing address with same validations.                                                                                                    |
| `deleteAddress()`     | Removes address, promotes next address to default if deleted was default.                                                                          |
| `setDefaultAddress()` | Switches default address atomically.                                                                                                               |
| `lookupPincode()`     | Resolves Indian postal code to city/state/localities via external API with 8s timeout.                                                             |

### 6.1.12 `subscriptionController.js` — Billing Management

| Function                       | Description                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `getSubscriptionPlans()`       | Returns available plans with purchase options (1/3/6/12 month durations with volume discounts).                 |
| `getSubscriptionSummary()`     | Current subscription status, trial state, feature access.                                                       |
| `getSubscriptionPayments()`    | Billing history (last 20 payments).                                                                             |
| `createSubscriptionCheckout()` | Creates Razorpay order for plan purchase. Computes pricing with duration discounts (3mo=5%, 6mo=10%, 12mo=20%). |
| `verifySubscriptionCheckout()` | Verifies Razorpay payment signature. Activates subscription, expires previous subscriptions.                    |
| `startSubscriptionTrial()`     | Activates 2-day free trial (one-time per account).                                                              |
| `validateCoupon()`             | Checks coupon code validity (exists, not used, not expired).                                                    |
| `activateCoupon()`             | Applies coupon to activate subscription for specified duration.                                                 |

### 6.1.13 `superAdminController.js` — Platform Administration

| Function                             | Description                                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| `getGlobalStats()`                   | Comprehensive platform overview: totals, charts, wholesaler directory, pending applications. |
| `getAllWholesalers()`                | Wholesaler list with computed metrics (revenue, inventory value, subscription status).       |
| `getTenantData()`                    | Deep-dive into specific wholesaler: products, orders, ledger, inventory logs, subscriptions. |
| `getPendingWholesalerApplications()` | Lists wholesalers awaiting approval.                                                         |
| `approveWholesalerApplication()`     | Approves wholesaler, sets onboarding status to APPROVED.                                     |
| `rejectWholesalerApplication()`      | Rejects with reason.                                                                         |
| `updateWholesalerLifecycle()`        | Suspend/reactivate wholesaler accounts.                                                      |
| `getAdminSubscriptionPlans()`        | Plan catalog for admin view.                                                                 |
| `getCoupons()`                       | Lists all coupons with usage status.                                                         |
| `createCoupon()`                     | Creates new promotional coupon linked to a plan.                                             |
| `deleteCoupon()`                     | Removes unused coupon.                                                                       |

### 6.1.14 `b2bController.js` — B2B Commerce

| Function                        | Description                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `registerB2BProfile()`          | Customer submits B2B business profile (companyName, taxId, businessAddress).        |
| `adminApproveB2B()`             | Admin approves/rejects B2B applications.                                            |
| `createRfq()`                   | B2B buyer creates RFQ with target price and quantity. Validates MOQ compliance.     |
| `respondToRfq()`                | Wholesaler accepts, rejects, or counter-offers an RFQ.                              |
| `getRfqs()`                     | Lists RFQs scoped by role (buyer sees own, wholesaler sees theirs, admin sees all). |
| `addProductPriceTiers()`        | Wholesaler sets volume-based pricing tiers for a product.                           |
| `getBusinessApplications()`     | Admin views all B2B applications.                                                   |
| `acceptQuote()`                 | Buyer accepts a counter-offered or pending RFQ.                                     |
| `buyerRespondToRfq()`           | Buyer counters or declines a wholesaler's counter-offer.                            |
| `getWholesalerBuyers()`         | Lists B2B buyers with credit limits and outstanding balances.                       |
| `updateWholesalerCreditLimit()` | Adjusts credit limit for a specific buyer.                                          |
| `getBuyerCreditStatus()`        | Buyer views their credit limits across all wholesalers.                             |

### 6.1.15 `paymentWebhookController.js` — Razorpay Webhooks

| Function                   | Description                                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `receiveRazorpayWebhook()` | Receives Razorpay server-to-server webhook events. Delegates to `razorpayWebhookService` for signature verification and event handling. |

---

## 6.2 Services (19 files)

### 6.2.1 `contentRecommendationService.js`

- `buildContentRecommendations({topK})` — Full corpus rebuild: tokenizes all products, computes TF-IDF vectors, calculates pairwise cosine similarity, stores top-K in `ProductSimilarity` table.
- `getContentSimilarProducts({productId, limit})` — Queries pre-computed similarities.
- `updateSingleProductContentRecommendations(productId)` — Incrementally updates similarity index when a single product changes.
- `queueProductRecommendationUpdate(productId)` — Non-blocking async wrapper for real-time updates after product CRUD.

### 6.2.2 `collaborativeFilteringService.js`

- `buildCollaborativeRecommendations({topK})` — Builds item-user interaction matrix from `RecommendationInteraction` + `OrderItem`. Computes cosine similarity between item vectors. Stores top-K collaborative similarities.
- `getCollaborativeSimilarProducts({productId, limit})` — Queries collaborative similarity results.

### 6.2.3 `popularityService.js`

- `getPopularityScores({scope})` — Computes popularity scores. "trending" scope uses 30-day window with exponential decay (halfLife=14 days, computed in PostgreSQL via `power(0.5, age/halfLife)`). "allTime" scope sums without decay.
- `getPopularProducts({scope, limit, excludeProductIds})` — Returns ranked products with fallback to newest products if insufficient popularity data.

### 6.2.4 `hybridRecommendationService.js`

- `getSimilarHybridRecommendations({productId, limit, userId})` — Combines content + collaborative + popularity sources. Normalizes scores to 0-1, applies hybrid weights (content=0.45, collaborative=0.30, popularity=0.20, review=0.05). Adds review quality scores. Creates `RecommendationLog` for attribution.
- `getUserHybridRecommendations({userId, limit})` — Personalized feed: fetches similarities for user's recent 4 interacted products, excludes already-seen products, fills with popularity if needed.

### 6.2.5 `interactionService.js`

- `logInteraction()` — Logs user interaction with view deduplication (30-min window). Validates recommendation attribution (24h window, user ownership, product membership).
- `logRecommendationEvent()` — Single event with impression deduplication (60-min window per surface).
- `logRecommendationEvents()` — Batch event logging with deduplication.
- `createPurchaseInteractions()` — Called during checkout to log purchase interactions with recommendation attribution.
- `validateRecommendationAttribution()` — Ensures recommendation log exists, belongs to user, is not expired, and contains the referenced product.

### 6.2.6 `evaluationService.js`

- `evaluateRecommendations({k, storeReport})` — Leave-one-out offline evaluation. For each user with 2+ purchases, holds out last purchase, generates recommendations from first purchase, checks if held-out item appears in top-K. Computes Precision@K, Recall@K, MAP@K, NDCG@K, HitRate@K, Coverage, Diversity. Optionally stores report with delta comparisons to previous run.

### 6.2.7 `orderReturnService.js`

- `requestOrderItemReturn()` — Full return request validation: 7-day window, delivery status, duplicate check, quantity validation. Uses `SELECT ... FOR UPDATE` row-level locks.
- `approveOrderItemReturn()` — Sets refund snapshot. Marks prepaid items for refund processing.
- `rejectOrderItemReturn()` — Records rejection with reason.
- `receiveOrderItemReturn()` — Marks item received, restores inventory, creates order adjustment, processes refund.
- `processReturnRefund()` — Executes Razorpay refund, updates item status to RETURN_COMPLETED, derives order-level status.
- `decorateOrderWithReturnFinancials()` — Computes return financial summaries (originalAmount, cancelledAmount, returnedAmount, payableAmount) and per-item eligibility flags.

### 6.2.8 `orderCancellationService.js`

- `cancelOrderItemForCustomer()` — Atomic cancellation with row locks. Restores stock, creates inventory log, ledger adjustment. Processes immediate refund for prepaid.
- `processCancelledItemRefund()` — Handles Razorpay refund creation with retry logic and failure classification.
- `retryOrderItemRefundForCustomer()` — Retries failed refunds.
- `refreshOrderPaymentStatus()` — Derives aggregate payment status from individual item refund states.

### 6.2.9 `disputeService.js`

- `createDispute()` — Full eligibility validation (delivered, not cancelled, no existing dispute, not fully refunded, no active return). Rate-limited per buyer. Creates evidence records.
- `moveDisputeToReview()` — Seller acknowledges dispute. Uses optimistic concurrency via `updatedAt` token.
- `resolveDispute()` — Resolves with APPROVE/REJECT/PARTIAL_REFUND. Calculates refund amount. Processes Razorpay refund for prepaid orders.
- `addDisputeInternalNote()` — Seller adds private notes. Max 1000 chars.
- `decorateOrderWithDisputes()` — Enriches order with serialized dispute data, timelines, and per-item eligibility flags.

### 6.2.10 `paymentRefundService.js`

- `createRazorpayRefund({order, amount, notes})` — Extracts payment ID from order metadata, executes Razorpay refund in paise.
- `getOrderPaymentMetadata(order)` — Parses `paymentReference` string format `orderId:paymentId`.
- `getRazorpayClient()` — Creates authenticated Razorpay instance from env vars.

### 6.2.11 `razorpayWebhookService.js`

- `handleRazorpayWebhook({rawBody, signature})` — Verifies HMAC signature. Routes events: `refund.created`/`refund.processed`/`refund.failed` → refund sync; `payment.captured` → capture confirmation; `payment.failed` → session failure.
- Refund sync: Matches refund to order item via notes or payment ID. Updates refund status and metadata.

### 6.2.12 `subscriptionService.js`

- `ensureDefaultSubscriptionPlans()` — Upserts TRIAL (₹0), STANDARD (₹1499/mo), PREMIUM (₹2999/mo) plans.
- `computePlanPricing(plan, durationMonths)` — Computes pricing with duration discounts.
- `buildWholesalerAccessSummary()` — Comprehensive access state: onboarding status, subscription, trial, feature access, support contact.
- `buildFeatureAccess()` — Derives boolean feature flags from active subscription plan features JSON.
- `startFreeTrial()` — One-time 2-day trial activation.
- `createCheckoutForSubscription()` — Creates Razorpay order for plan purchase.
- `verifyCheckoutPayment()` — Verifies payment, activates subscription, expires previous ones.
- `validateCouponCode()` / `activateCouponSubscription()` — Coupon validation and activation.
- `assertOperationalWholesaler()` — Guards requiring APPROVED/ACTIVE/PAST_DUE status.
- `assertFeatureAccess()` — Guards requiring specific plan feature.

### 6.2.13 `pincodeLookupService.js`

- `lookupIndianPincode(postalCode)` — Validates 6-digit code. Fetches from `api.postalpincode.in` with 8s timeout. Returns city, district, state, localities.

### 6.2.14 `analyticsOverviewService.js`

- `buildAnalyticsOverview({products, orders, timeframe})` — Full analytics computation: headline KPIs (revenue, profit, margin, inventory value, CLV), sales trends by period, top SKUs by units/revenue/profit, slow-moving inventory (>30 days no sale), customer insights (repeat rates, churn risk scoring: high risk >90 days, medium risk 45-90 days).

### 6.2.15 `recommendationConstants.js`

- Exports `INTERACTION_WEIGHTS` (view=1, wishlist=3, cart=4, purchase=7, review=5)
- Exports `HYBRID_WEIGHTS` (content=0.45, collaborative=0.30, popularity=0.20, review=0.05)
- Exports `VALID_INTERACTION_ACTIONS` and `VALID_RECOMMENDATION_EVENTS`

---

# Chapter 7: AI Engines — Detailed Implementation

## 7.1 Hybrid Recommendation Engine

### 7.1.1 Architecture Overview

The recommendation system operates in two phases:

1. **Offline Phase** — Background jobs compute similarity matrices and store them in the database
2. **Online Phase** — API requests query pre-computed data, normalize scores, and apply hybrid weighting

### 7.1.2 Content-Based Engine (`contentRecommendationService.js`)

**Corpus Assembly:**

```
corpus(product) = [name, category, description, SKU, sizes, wholesaler.businessName].join(' ')
```

**Tokenization:** Lowercase → remove non-alphanumeric → split by whitespace → filter tokens ≤2 chars.

**TF-IDF Vector Computation:**

- For each product, compute term frequencies within its corpus
- Calculate IDF across all documents: `idf(t) = log((N+1)/(df(t)+1)) + 1`
- Each term's TF-IDF weight: `tf(t,d) × idf(t)`, stored as JSON in `ProductFeature.tfidfVector`

**Similarity Calculation:**

- Pairwise cosine similarity between all TF-IDF vectors
- Top-K (default 10) most similar products stored in `ProductSimilarity` with method=CONTENT

**Real-Time Updates:**
When a product is created/updated, `updateSingleProductContentRecommendations()`:

1. Recomputes TF-IDF vector for the changed product
2. Calculates similarity with all existing products
3. Updates both forward (product→others) and reverse (others→product) similarity entries
4. Only modifies entries where the new score would displace existing top-K entries

### 7.1.3 Collaborative Filtering Engine (`collaborativeFilteringService.js`)

**Interaction Matrix Construction:**

- Rows = Products, Columns = Users
- Cell value = `max(weight × quantity)` across all interactions
- Sources: `RecommendationInteraction` (view, wishlist, cart, review) + `OrderItem` (purchase)

**Similarity Computation:**

- Item-based cosine similarity between product interaction vectors
- Products frequently bought/viewed by the same users get high scores
- Top-K stored with method=COLLABORATIVE

### 7.1.4 Popularity Engine (`popularityService.js`)

**Trending Scope (30-day window):**

```sql
SELECT productId, action,
  SUM(quantity * power(0.5, age_seconds / 86400 / 14.0)) as weightedScore
FROM RecommendationInteraction
WHERE createdAt >= now() - interval '30 days'
GROUP BY productId, action
```

Combined with purchase data from `OrderItem` joined with `Order`.

**All-Time Scope:** Simple `SUM(quantity)` without decay.

**Final Score:** `Σ(INTERACTION_WEIGHTS[action] × weightedScore)` per product.

### 7.1.5 Hybrid Score Synthesis (`hybridRecommendationService.js`)

**Normalization:** Each source's scores are normalized to [0,1] by dividing by the max score in that source.

**Weighted Combination:**

```
HybridScore = (content × 0.45) + (collaborative × 0.30) + (popularity × 0.20) + (review × 0.05)
```

**Review Score Computation:** `(avgRating / 5) × min(1, reviewCount / 5)` — confidence-weighted average.

**Attribution Pipeline:**
Every rendered recommendation set creates a `RecommendationLog` storing the userId, surface, algorithm, and ordered productIds. This ID is passed to the frontend for subsequent event attribution (impression → click → cart → purchase).

### 7.1.6 Offline Job Scripts

| Script                                 | npm Command                        | Purpose                    |
| -------------------------------------- | ---------------------------------- | -------------------------- |
| `buildContentRecommendations.js`       | `recommendations:build-content`    | Full TF-IDF rebuild        |
| `buildCollaborativeRecommendations.js` | `recommendations:build-cf`         | Full CF matrix rebuild     |
| `buildPopularityRecommendations.js`    | `recommendations:build-popularity` | Verify popularity pipeline |
| `evaluateRecommendations.js`           | `recommendations:evaluate`         | Run offline benchmarks     |
| `benchmarkRecommendations.js`          | `recommendations:benchmark`        | Extended benchmarking      |

---

## 7.2 AI Business Advisor (RAG Agent)

### 7.2.1 System Architecture

```
┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ Chat Route   │───▶│ Advisor Service  │───▶│ LLM Provider     │
│ POST /chat   │    │                  │    │ (Gemini/Ollama/  │
└──────────────┘    │ ┌──────────────┐ │    │  OpenRouter)     │
                    │ │ Question     │ │    └──────────────────┘
                    │ │ Classifier   │ │
                    │ └──────────────┘ │    ┌──────────────────┐
                    │ ┌──────────────┐ │───▶│ Retrieval Service│
                    │ │ Context      │ │    │ BM25 + ChromaDB  │
                    │ │ Builder      │ │    └──────────────────┘
                    │ └──────────────┘ │
                    │ ┌──────────────┐ │    ┌──────────────────┐
                    │ │ Rule Engine  │ │    │ Session Memory   │
                    │ └──────────────┘ │    └──────────────────┘
                    └─────────────────┘
```

### 7.2.2 Service Components

**`advisor_service.py` — Orchestrator:**

1. Normalizes query and session ID
2. Generates rule-based insights from business context
3. Classifies question type (knowledge-base / business-context / hybrid)
4. Checks for unavailable historical data requests → returns immediate fallback
5. Retrieves relevant documents (if knowledge-base or hybrid type)
6. Checks KB readiness and confidence threshold
7. Builds LLM prompt with all context layers
8. Invokes LLM via LangChain prompt chain
9. Extracts text response, builds citations, updates session memory

**`question_classifier.py` — Intent Detection:**
Classifies queries into three types using keyword hint matching:

- `business-context`: Queries about seller's own metrics ("my sales", "my inventory")
- `knowledge-base`: General knowledge queries ("what is", "best practices", "strategies")
- `hybrid`: Queries needing both seller data and knowledge ("my retention strategies")

**`retrieval_service.py` — Hybrid Document Retrieval:**

1. **Semantic Search:** ChromaDB `similarity_search_with_relevance_scores(query, k=5)`
2. **Keyword Search:** Cached BM25Okapi index over all documents
3. **Score Fusion:** `combined = semantic_score × 0.7 + keyword_score × 0.3`
4. **Confidence Check:** `best_semantic_score >= 0.55` determines confidence
5. **Results:** Returns `RetrievalResult(confident, knowledge_base_ready, documents, best_semantic_score)`

**Cache Architecture:** BM25 index is built once on first access and stored in module-level globals with thread-safe lock. Rebuilt only when `invalidate_bm25_cache()` is called after document ingestion.

**`domain_filter.py` — Off-Topic Rejection:**
Uses LLM to classify whether a query is business-related. Falls open on failure (better UX than false rejection).

**`context_builder.py` — Business Metrics Formatting:**
Converts seller's numerical metrics into natural language paragraphs for the LLM prompt:

- Monthly sales revenue
- Low stock product count
- Dead inventory count
- Top selling category
- Repeat customer rate with health assessment

**`llm_provider.py` — Multi-Provider LLM Factory:**
Supports three backends via `LLM_PROVIDER` env var:

- `gemini` (default): ChatGoogleGenerativeAI with temperature=0.2
- `ollama`: Local Ollama instance with configurable model
- `openrouter`: OpenRouter API (DeepSeek, etc.)

**`rule_engine.py` — Deterministic Insights:**
Generates rule-based insights from business context without LLM calls (e.g., "Your low stock count is concerning", "Repeat rate below 30% needs attention").

**`citation_service.py` — Source Attribution:**
Extracts file names and page numbers from retrieved document metadata. Returns `[{file, page}]` for frontend display.

### 7.2.3 Document Ingestion Pipeline (`routes/ingest.py`)

1. **Load PDFs:** `PyPDFDirectoryLoader` scans `./app/docs/` directory
2. **Split into Chunks:** `RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)`
3. **Deduplication:** Collection cleared before re-ingestion (configurable: replace/skip mode)
4. **Embed & Store:** Chunks processed by sentence-transformers → stored in ChromaDB
5. **Cache Invalidation:** BM25 cache rebuilt after ingestion

### 7.2.4 Embeddings (`embeddings/embedder.py`)

- Model: `sentence-transformers/all-MiniLM-L6-v2`
- Auto-detects compute device: CUDA → MPS → CPU
- Singleton pattern via `@lru_cache(maxsize=1)`
- Embeddings normalized (`normalize_embeddings=True`)
- Pre-loaded at application startup via FastAPI lifespan event

### 7.2.5 Vector Store (`vectorstore/chroma_store.py`)

- ChromaDB persistent store at `./chroma_db`
- Collection name: `nexcart_business_docs`
- Functions: `get_vectorstore()`, `get_retriever(k=6)`, `add_documents(docs)`

### 7.2.6 Prompt Engineering (`prompts/templates.py`)

The system prompt establishes the AI as a "senior e-commerce and wholesale business consultant" with:

- Business context section (seller metrics)
- RAG context section (retrieved knowledge base passages)
- Conversation history for multi-turn coherence
- Citation instructions ("According to the Shopify retention guide...")
- Constraints (only business topics, actionable advice, end with next action)

### 7.2.7 Session Memory (`memory/session_memory.py`)

In-memory per-session conversation history for multi-turn dialogue. Messages stored as `{role, content}` pairs. History formatted as string for prompt injection.

---

## 7.3 AI Khatta Digitizer (Vision Scanner)

### 7.3.1 Processing Pipeline

1. **Image Upload:** Frontend sends base64-encoded image via POST `/api/khatta/process`
2. **MIME Detection:** Extracts image type from data URI prefix
3. **Gemini Vision Call:** Sends image + structured extraction prompt to `gemini-2.5-flash`
4. **JSON Parsing:** Strips markdown code fences, parses response as JSON array
5. **Frontend Review:** User reviews/edits extracted entries in UI table
6. **Database Save:** POST `/api/khatta/save` creates ledger entries in Prisma transaction

### 7.3.2 Extraction Prompt

```
Extract transaction lines from this invoice.
Return ONLY a raw JSON array.
Fields:
  "customerEmail": (Best guess email from name),
  "amount": (Number, negative for debt/invoice),
  "notes": (Item description),
  "isTotal": (Boolean: true if this row is the Grand Total/Subtotal)
```

### 7.3.3 Database Integration

- Batch email lookup: Finds all referenced customer accounts
- Creates `LedgerEntry` per valid customer with source description "AI Scan: {notes}"
- All entries within single Prisma `$transaction` for atomicity

---

# Chapter 8: Frontend Implementation

## 8.1 Technology Stack & Build System

- **Framework:** React 19 with functional components and hooks
- **Build Tool:** Vite (fast HMR, optimized production builds)
- **State Management:** Zustand v5 (two stores: auth, cart)
- **Styling:** Tailwind CSS v4 with `cn()` utility for class merging
- **HTTP Client:** Axios with interceptor for JWT header injection
- **Package Manager:** pnpm (workspace mode, filtered commands)

## 8.2 Application Structure

```
client/src/
├── api/                    # API client modules
│   ├── axios.js           # Configured Axios instance with auth interceptor
│   ├── queries.js         # All backend API call functions
│   └── aiAdvisor.js       # AI Advisor API client (FastAPI)
├── app/                    # App-level configuration
├── components/             # Reusable UI components
│   ├── advisor/           # AI Advisor chat components
│   ├── dashboard/         # Dashboard widgets
│   ├── orders/            # Order-related components
│   ├── wholesaler/        # Wholesaler-specific components
│   ├── AuthModal.jsx      # Login/Register modal
│   ├── DataTable.jsx      # Generic data table
│   ├── ErrorBoundary.jsx  # Error boundary wrapper
│   ├── FormFields.jsx     # Reusable form inputs
│   ├── LoadingSpinner.jsx # Loading indicator
│   └── ProductForm.jsx    # Product create/edit form
├── layouts/               # Page layout wrappers
├── pages/                 # 27 full page views
├── store/                 # Zustand global state
│   ├── authStore.js       # Authentication state & actions
│   └── cartStore.js       # Shopping cart state & actions
└── utils/                 # Utility functions (cn.js, etc.)
```

## 8.3 Page Views (27 pages)

### Customer-Facing Pages:

| Page               | File                    | Purpose                                                                   |
| ------------------ | ----------------------- | ------------------------------------------------------------------------- |
| Storefront         | `Storefront.jsx`        | Main marketplace with recommendation carousels, search, category filters  |
| Product Details    | `ProductDetails.jsx`    | Single product view with reviews, similar products, add-to-cart           |
| Cart               | `Cart.jsx`              | Shopping cart with quantity management, size display, checkout initiation |
| Orders             | `Orders.jsx`            | Order history with status tracking, return/cancel actions, dispute filing |
| Customer Dashboard | `CustomerDashboard.jsx` | Customer overview panel                                                   |
| Login              | `Login.jsx`             | Authentication page                                                       |
| Register           | `Register.jsx`          | Registration form (customer or wholesaler with business fields)           |
| B2B Onboarding     | `B2BOnboarding.jsx`     | Business profile submission for B2B buyer verification                    |
| RFQ Manager        | `RfqManager.jsx`        | RFQ negotiation interface (create, respond, accept quotes)                |

### Wholesaler Pages:

| Page                   | File                       | Purpose                                                            |
| ---------------------- | -------------------------- | ------------------------------------------------------------------ |
| Business Dashboard     | `BusinessDashboard.jsx`    | Revenue/profit charts, debt overview, low stock alerts             |
| Products               | `Products.jsx`             | Product CRUD list with inventory status                            |
| Seller Product Details | `SellerProductDetails.jsx` | Seller-side product editing with price tiers                       |
| Inventory              | `Inventory.jsx`            | Stock adjustment interface with audit log                          |
| Ledger                 | `Ledger.jsx`               | Customer credit ledger with payment recording                      |
| AI Khatta              | `AiKhatta.jsx`             | Receipt scanner upload, OCR results table, save-to-DB              |
| Business Advisor       | `BusinessAdvisor.jsx`      | RAG chatbot console with conversation history                      |
| Analytics              | `Analytics.jsx`            | Advanced analytics dashboard (trends, SKU performance, churn risk) |
| Wholesaler Billing     | `WholesalerBilling.jsx`    | Subscription management, plan selection, payment history           |

### Admin Pages:

| Page                      | File                          | Purpose                                                      |
| ------------------------- | ----------------------------- | ------------------------------------------------------------ |
| Super Admin Dashboard     | `SuperAdminDashboard.jsx`     | Platform-wide stats, wholesaler directory, pending approvals |
| Super Admin Subscriptions | `SuperAdminSubscriptions.jsx` | Plan management, coupon creation                             |

### Static/Info Pages:

| Page             | File                  | Purpose                     |
| ---------------- | --------------------- | --------------------------- |
| About Us         | `AboutUs.jsx`         | Platform information        |
| Contact Us       | `ContactUs.jsx`       | Support contact details     |
| FAQ              | `Faq.jsx`             | Frequently asked questions  |
| Privacy Policy   | `PrivacyPolicy.jsx`   | Privacy terms               |
| Not Found        | `NotFound.jsx`        | 404 error page              |
| Dashboard        | `Dashboard.jsx`       | Role-based dashboard router |
| Retail Dashboard | `RetailDashboard.jsx` | Retail-focused view         |

## 8.4 State Management (Zustand Stores)

### `authStore.js` — Authentication State

- `user` — Current user profile
- `token` — JWT token
- `isAuthenticated` — Boolean flag
- `login(credentials)` — Calls login API, stores token
- `logout()` — Calls logout API, clears state
- `refreshProfile()` — Refetches user profile

### `cartStore.js` — Shopping Cart State

- `items` — Cart line items array
- `totals` — Computed subtotal and item count
- `fetchCart()` — Loads cart from backend
- `addItem(productId, quantity, size)` — Adds item with recommendation attribution
- `updateItem(itemId, quantity)` — Updates quantity
- `removeItem(itemId)` — Removes item
- `clearCart()` — Empties cart

## 8.5 API Client Layer

### `axios.js` — Configured Instance

- Base URL: `http://localhost:5000/api`
- Request interceptor: Injects `Authorization: Bearer <token>` header
- Response interceptor: Handles 401 (token expired → force logout)

### `queries.js` — Backend API Functions

Comprehensive API client covering all endpoints: auth, products, cart, orders, inventory, ledger, stats, recommendations, subscriptions, addresses, B2B, admin operations.

### `aiAdvisor.js` — AI Service Client

- Base URL: `http://localhost:8000`
- `sendQuery({query, sessionId, businessContext})` — Calls RAG advisor
- `ingestDocuments()` — Triggers knowledge base ingestion
- `getHistory(sessionId)` — Fetches conversation history

---

# Chapter 9: B2B Wholesale Commerce Module

## 9.1 B2B Business Profile & Onboarding

### Flow:

1. Customer submits B2B profile (`POST /api/b2b/register`) with companyName, taxId, businessAddress
2. Profile created with `verification: APPLIED`
3. Super Admin reviews applications (`GET /api/b2b/applications`)
4. Admin approves/rejects (`POST /api/b2b/admin/approve/:id`)
5. Approved buyers gain access to RFQ system and trade credit checkout

## 9.2 Request for Quotation (RFQ) System

### Negotiation Flow:

```
Buyer creates RFQ (quantity + targetPrice)
       ↓
Wholesaler responds:
  ├── ACCEPTED → Buyer can checkout at agreed price
  ├── REJECTED → Negotiation ends
  └── COUNTER_OFFERED (counterPrice) → Buyer responds:
        ├── Accept quote → status = ACCEPTED
        ├── Counter (new targetPrice) → status = PENDING (back to seller)
        └── Decline → status = REJECTED
```

### Validation Rules:

- Only approved B2B profiles can create RFQs
- Quantity must meet product's `minOrderQty`
- Finalized RFQs (ACCEPTED, ORDER_PLACED) cannot be modified

## 9.3 Volume-Based Price Tiers

Wholesalers set graduated pricing via `POST /api/b2b/products/:id/tiers`:

```json
{
  "tiers": [
    { "minQuantity": 10, "unitPrice": 95.0 },
    { "minQuantity": 50, "unitPrice": 85.0 },
    { "minQuantity": 100, "unitPrice": 75.0 }
  ]
}
```

### Price Resolution at Checkout (priority order):

1. **Active accepted RFQ** — If buyer has an accepted RFQ for this product and meets quantity threshold, use RFQ price
2. **Price tiers** — Apply highest applicable tier for the ordered quantity
3. **Retail price** — Fallback to standard product price

## 9.4 Trade Credit (Ledger Credit) Checkout

B2B buyers can checkout using `LEDGER_CREDIT` payment method:

- Validates buyer has APPROVED and ACTIVE business profile
- Checks credit limit per wholesaler: `currentOutstanding + orderTotal ≤ creditLimit`
- Default credit limit: ₹50,000 per wholesaler relationship
- On insufficient credit: Returns detailed error with available balance

## 9.5 Wholesaler Credit Management

- `GET /api/b2b/wholesaler/buyers` — Lists all B2B buyers with credit status
- `POST /api/b2b/wholesaler/buyers/:buyerId/credit-limit` — Adjusts credit limit
- Balance is auto-computed from ledger entries via Prisma extension

---

# Chapter 10: Subscription & Billing System

## 10.1 Plan Structure

| Plan     | Monthly Price | Features                                    |
| -------- | ------------- | ------------------------------------------- |
| TRIAL    | ₹0 (2 days)   | analytics, recommendations, advisor, khatta |
| STANDARD | ₹1,499/mo     | analytics, recommendations                  |
| PREMIUM  | ₹2,999/mo     | analytics, recommendations, advisor, khatta |

### Duration Discounts:

| Duration  | Discount |
| --------- | -------- |
| 1 month   | 0%       |
| 3 months  | 5%       |
| 6 months  | 10%      |
| 12 months | 20%      |

## 10.2 Subscription Lifecycle

```
Wholesaler APPROVED → Start Free Trial (2 days)
         ↓                    ↓
  Trial Expires         Trial Active (full features)
         ↓
  Purchase Plan → Razorpay Checkout → Verify Payment → Activate Subscription
         ↓
  Subscription Active (features based on plan)
         ↓
  Period Ends → PAST_DUE (grace) → EXPIRED (feature locked)
```

## 10.3 Feature Gating

The `requireWholesalerFeature(feature)` middleware checks:

1. User is WHOLESALER with a profile
2. Current subscription is ACTIVE
3. Plan's `features` JSON includes the requested feature as `true`

Protected features:

- `analytics` — Advanced analytics dashboard
- `recommendations` — Recommendation analytics & health
- `advisor` — AI Business Advisor access
- `khatta` — AI Khatta OCR scanner

## 10.4 Coupon System

Admins create coupons linked to specific plans:

- `code` — Unique activation code
- `planId` — Which plan to activate
- `durationDays` — Subscription duration granted
- `expiryDate` — Code expiration date
- One-time use: `isUsed` flag with `usedById` tracking

## 10.5 Payment Processing

Uses Razorpay payment gateway:

1. `createSubscriptionCheckout()` → Creates Razorpay order with computed amount
2. Frontend opens Razorpay modal with returned `keyId` and `razorpayOrderId`
3. On payment success, frontend calls `verifySubscriptionCheckout()`
4. Backend verifies HMAC-SHA256 signature: `HMAC(razorpayOrderId|razorpayPaymentId, keySecret)`
5. On valid: expires previous subscriptions, creates new active subscription, updates payment record

---

# Chapter 11: Order Lifecycle, Returns & Dispute Resolution

## 11.1 Order Status Lifecycle

```
PENDING → PROCESSING → SHIPPED → DELIVERED → (RETURN_COMPLETED)
    ↓                                              ↑
 CANCELLED (if all items cancelled)         (if all items returned)
```

## 11.2 Item-Level Cancellation

**Eligibility:** Order status must be PENDING or PROCESSING.

**Process:**

1. Row-level lock: `SELECT id FROM OrderItem WHERE id = :itemId FOR UPDATE`
2. Mark item as CANCELLED with timestamp and reason
3. Restore product stock (atomic increment)
4. Create inventory log (reason: CANCELLATION)
5. Create ledger entry (positive amount = credit to buyer)
6. Recalculate order total (sum of remaining active items)
7. If no active items remain: set order status to CANCELLED
8. For PREPAID orders: initiate Razorpay refund immediately

**Refund States:** NOT_APPLICABLE → PENDING → PROCESSING → REFUNDED/FAILED

## 11.3 Return Workflow

### Return Request (Customer):

- Eligibility: Order DELIVERED + item ACTIVE + no existing return + within 7-day window
- Customer selects: reason (WRONG_ITEM/DAMAGED/DEFECTIVE/CHANGED_MIND/MISSING_PARTS/OTHER), notes, quantity

### Return Approval (Wholesaler):

- Calculates `refundAmountSnapshot = unitPrice × returnedQuantity`
- For PREPAID orders: sets `returnRefundStatus = PENDING`

### Return Rejection (Wholesaler):

- Records rejection reason, updates status to REJECTED

### Return Receive (Wholesaler):

- Marks item as physically received
- Restores inventory (stock increment + inventory log)
- Creates `OrderAdjustment` record for financial tracking
- For PREPAID: processes Razorpay refund
- For COD: creates positive ledger entry
- Updates item to RETURN_COMPLETED

### Order-Level Status:

If all active items are fully returned → order status becomes RETURN_COMPLETED

## 11.4 Dispute Resolution

### Eligibility Rules:

- Order must be DELIVERED
- Item must not be CANCELLED
- No existing dispute for this item (one dispute per item lifetime)
- Item not fully refunded
- No active return workflow in progress

### Dispute Lifecycle:

```
OPEN (buyer files) → UNDER_REVIEW (seller acknowledges) → RESOLVED
```

### Resolution Types:

| Type           | Action                                                     |
| -------------- | ---------------------------------------------------------- |
| APPROVE        | Full refund of remaining refundable amount                 |
| REJECT         | No refund                                                  |
| PARTIAL_REFUND | Seller-specified amount (validated ≤ remaining refundable) |

### Optimistic Concurrency:

All seller mutations require `updatedAt` token matching current DB value. Prevents race conditions when multiple team members access the same dispute.

### Rate Limiting:

Buyers limited to 5 disputes per 24-hour window (configurable via `DISPUTE_MAX_PER_WINDOW`).

## 11.5 Payment Webhook Integration

Razorpay sends server-to-server webhooks for:

- `payment.captured` — Confirms payment capture, updates order status
- `payment.failed` — Marks checkout session as failed
- `refund.created` — Updates item refund status to PROCESSING
- `refund.processed` — Marks refund as REFUNDED with amount and timestamp
- `refund.failed` — Marks refund as FAILED with failure reason

Webhook verification: HMAC-SHA256 signature check using `RAZORPAY_WEBHOOK_SECRET`.

---

# Chapter 12: Security, Middleware & Rate Limiting

## 12.1 Authentication Middleware (`authMiddleware.js`)

### `authenticate` — JWT Verification

1. Extracts token from `Authorization: Bearer <token>` header
2. Checks token against `BlacklistedToken` table (revoked tokens)
3. Verifies JWT signature using `JWT_SECRET`
4. Fetches full user record with wholesaler profile and subscription chain
5. Builds `req.user` object with: userId, role, wholesalerId, wholesalerProfile, onboardingStatus, featureAccess, subscription
6. Handles `JsonWebTokenError` and `TokenExpiredError` → 403 response

### `optionalAuthenticate` — Guest-Friendly Auth

Same as `authenticate` but does not reject requests without tokens. Used for public endpoints that benefit from user context (e.g., personalized recommendations for logged-in users, generic for guests).

### `requireWholesaler` — Role Guard

Checks `req.user.role === 'WHOLESALER'` and `req.user.wholesalerId` exists.

### `requireOperationalWholesaler` — Active Seller Guard

Calls `assertOperationalWholesaler()` — requires onboarding status in {APPROVED, ACTIVE, PAST_DUE}.

### `requireWholesalerFeature(feature)` — Feature Gate

Calls `assertFeatureAccess()` — checks active subscription includes the requested feature.

### `requireSuperAdmin` — Admin Guard

Checks `req.user.role === 'SUPER_ADMIN'`.

### `requireRoles(...roles)` — Flexible Role Guard

Accepts multiple roles as arguments. Used for endpoints accessible by both WHOLESALER and SUPER_ADMIN.

## 12.2 Rate Limiting (`rateLimiter.js`)

| Limiter         | Window   | Max Requests | Applied To                          |
| --------------- | -------- | ------------ | ----------------------------------- |
| `globalLimiter` | 1 minute | 100          | All routes                          |
| `authLimiter`   | 1 minute | 5            | /api/auth/register, /api/auth/login |
| `scanLimiter`   | 1 minute | 5            | /api/khatta/process (AI OCR)        |

Implementation: `express-rate-limit` with standard headers and no legacy headers.

## 12.3 HTTP Security (Helmet)

Applied globally via `app.use(helmet())`:

- X-XSS-Protection header
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (HSTS)
- X-Frame-Options: DENY
- Content-Security-Policy defaults

## 12.4 CORS Configuration

Origin whitelist loaded from `ALLOWED_ORIGINS` environment variable (comma-separated). Defaults to `http://localhost:5173, http://localhost:3000`. Credentials enabled for cookie-based auth support.

## 12.5 Input Validation Patterns

### Password Strength (`authValidation.js`):

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Email Validation:

- Pattern: `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- Case-insensitive normalization via `toLowerCase()`

### Address Validation:

- Indian phone: `^[6-9]\d{9}$` (10-digit mobile starting with 6-9)
- Postal code: `^\d{6}$` (exactly 6 digits)
- Required fields enforcement
- Pincode resolution cross-check (city/state must match lookup)

### Financial Validation:

- Dispute descriptions: min 12, max 1000 characters
- Evidence URLs: valid http/https, max 5 per dispute
- Refund amounts: positive, ≤ item subtotal, ≤ remaining refundable

## 12.6 Concurrency Control

### Row-Level Locking:

```sql
SELECT "id" FROM "OrderItem" WHERE "id" = $1 FOR UPDATE
```

Used before all order item mutations (cancel, return, dispute) to prevent race conditions.

### Optimistic Concurrency:

Dispute mutations require matching `updatedAt` timestamp to detect concurrent modifications.

### Atomic Stock Decrements:

```javascript
await tx.product.updateMany({
  where: { id: productId, currentStock: { gte: quantity } },
  data: { currentStock: { decrement: quantity } },
});
// If count === 0, product went out of stock → rollback transaction
```

---

# Chapter 13: Testing, Evaluation & Results

## 13.1 Recommendation Engine Benchmarking

### Methodology: Leave-One-Out Evaluation

For each user with ≥2 purchases:

1. Use first purchased product as anchor
2. Hold out last purchased product as ground truth
3. Generate top-K recommendations from anchor
4. Check if held-out product appears in recommendations

### Metrics Computed:

| Metric      | Formula                                  | Purpose                                       |
| ----------- | ---------------------------------------- | --------------------------------------------- |
| Precision@K | relevant_in_topK / K                     | Fraction of recommendations that are relevant |
| Recall@K    | relevant_in_topK / total_relevant        | Fraction of relevant items retrieved          |
| MAP@K       | Σ(Precision@i × rel(i)) / K              | Rank-sensitive precision                      |
| NDCG@K      | DCG@K / IDCG@K                           | Normalized discounted cumulative gain         |
| HitRate@K   | users_with_hit / total_users             | Fraction of users with at least one hit       |
| Coverage    | unique_recommended / total_products      | Catalog diversity                             |
| Diversity   | unique_categories / recommended_products | Category spread                               |

### Benchmark Results (K=5):

| Metric             | Value  |
| ------------------ | ------ |
| Evaluated Users    | 3      |
| Precision@5        | 0.0667 |
| Recall@5           | 0.3333 |
| MAP@5              | 0.1667 |
| NDCG@5             | 0.2103 |
| HitRate@5          | 0.3333 |
| Catalog Coverage   | 24.0%  |
| Category Diversity | 18.0%  |

### Interpretation:

- 33.3% hit rate demonstrates the hybrid model successfully surfaces relevant items
- Coverage of 24% at K=5 shows diversity (not recommending only popular items)
- Small evaluation set (3 users) limits statistical significance but validates pipeline correctness

## 13.2 Concurrency Testing

### Atomic Inventory Reservation:

- 10 concurrent checkout requests for a product with 1 unit in stock
- Result: 1 transaction succeeded, 9 rolled back
- Verified: No overselling occurred

### Payment Idempotency:

- Multiple verification requests for same Razorpay payment ID
- Result: Returns existing order record without creating duplicates

### COD Auto-Settlement:

- Concurrent DELIVERED status updates for same order
- Result: Only one ledger entry created (unique constraint on idempotencyKey)

## 13.3 AI Advisor Evaluation

### Confidence Threshold Testing:

- Business-related queries with knowledge base content → semantic score > 0.55 → contextual response
- Out-of-domain queries (e.g., "What's the weather?") → score < 0.55 → fallback message
- Historical data requests ("last year's revenue") → immediate fallback without LLM call

### Response Quality:

- Personalized advice using seller metrics (monthly sales, low stock alerts)
- Source citations from retrieved knowledge base documents
- Multi-turn conversation coherence via session memory

---

# Chapter 14: Deployment & DevOps

## 14.1 Project Scripts (`package.json`)

| Script       | Command                                     | Purpose                   |
| ------------ | ------------------------------------------- | ------------------------- |
| `dev`        | `concurrently dev:server dev:client dev:ai` | Start all 3 services      |
| `dev:server` | `nodemon src/index.js`                      | Express with hot-reload   |
| `dev:client` | `pnpm --filter frontend dev`                | Vite dev server           |
| `dev:ai`     | `uvicorn app.main:app --reload`             | FastAPI with hot-reload   |
| `build`      | `pnpm --filter frontend build`              | Production frontend build |
| `lint`       | `eslint + ruff`                             | Code quality checks       |
| `format`     | `prettier + ruff format`                    | Code formatting           |
| `db:reset`   | `prisma migrate reset --force`              | Reset database            |
| `test`       | `node --test src/**/*.test.js`              | Run test suite            |

## 14.2 Docker Configuration

### `Dockerfile`:

Multi-stage build for the Express server with production Node.js image.

### `docker-compose.yml`:

Orchestrates PostgreSQL, Express backend, and potentially the AI service.

## 14.3 Environment Configuration

Key environment variables:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — Payment gateway credentials
- `RAZORPAY_WEBHOOK_SECRET` — Webhook signature verification
- `GEMINI_API_KEY` — Google AI API key
- `ALLOWED_ORIGINS` — CORS whitelist
- `PORT` — Server port (default 5000)
- `LLM_PROVIDER` — AI service LLM backend (gemini/ollama/openrouter)
- `EMBEDDING_MODEL` — sentence-transformers model name
- `MIN_RETRIEVAL_SCORE` — RAG confidence threshold (0.55)
- `RETRIEVAL_TOP_K` — Number of retrieved documents (5)

## 14.4 Monorepo Structure

Managed via `pnpm-workspace.yaml`:

```yaml
packages:
  - 'client'
```

The root `package.json` contains all backend dependencies and scripts. The frontend is a separate workspace package (`frontend`) with its own `package.json`.

---

# Chapter 15: Conclusion & Future Scope

## 15.1 Summary of Contributions

NexCart demonstrates a production-grade, AI-enabled B2B & B2C e-commerce platform with:

1. **Hybrid Recommendation Engine** — Three-algorithm fusion (TF-IDF content, collaborative filtering, time-decay popularity) with real-time index updates, full attribution pipeline, and offline benchmarking
2. **RAG Business Advisor** — Multi-provider LLM support, BM25+ChromaDB hybrid retrieval, confidence-based fallbacks, rule-based insights, conversation memory, and domain filtering
3. **Vision-Based Ledger Digitization** — Gemini multimodal parsing with human-in-the-loop review and atomic database writes
4. **B2B Commerce** — Complete RFQ negotiation workflow, volume pricing, trade credit with credit limit enforcement
5. **SaaS Subscription System** — Multi-tier plans with Razorpay billing, free trials, coupon activation, and feature gating
6. **Full Order Lifecycle** — Multi-seller checkout, item-level cancellation, 7-day return window, dispute resolution, Razorpay refund processing, webhook integration
7. **Enterprise Security** — JWT with token blacklisting, role-based access, feature-based access, rate limiting, optimistic concurrency, row-level locking, atomic stock management
8. **Advanced Analytics** — Time-series revenue/profit, churn risk scoring, CLV estimation, slow-moving inventory detection, repeat customer rates

## 15.2 Project Limitations

- **Cold Start:** New users rely primarily on popularity rankings until sufficient interaction data accumulates
- **Offline Computation:** Similarity matrices require periodic rebuilds; extremely large catalogs would need streaming computation
- **Single Region:** Database and services deployed in single region; no geo-distribution
- **Limited NLP:** Question classifier uses keyword matching rather than trained intent classification
- **Small Evaluation Set:** Benchmark results limited by small seed data; larger datasets would provide statistically significant metrics

## 15.3 Future Enhancements

1. **Real-Time Recommendations** — Replace offline jobs with Apache Kafka streaming for immediate collaborative signal updates
2. **Fine-Tuned Vision Models** — Train on local handwriting styles to improve OCR accuracy for messy receipts
3. **Multi-Tenant Isolation** — Database-level tenant isolation for enterprise wholesaler deployments
4. **GraphQL API** — Replace REST with GraphQL for flexible frontend data fetching
5. **Push Notifications** — Real-time order status updates and low-stock alerts
6. **ML-Based Fraud Detection** — Anomaly detection on order patterns and refund frequency
7. **A/B Testing Framework** — Compare recommendation algorithm variants with controlled experiments
8. **Trained Intent Classifier** — Replace keyword matching in question_classifier with a fine-tuned NLU model

---

# References

1. Aggarwal, C. C. (2016). _Recommender Systems: The Textbook_. Springer.
2. Lewis, P., et al. (2020). _Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks_. Advances in Neural Information Processing Systems, 33.
3. Prisma Documentation (2026). _Database Transactions and Concurrency Control_. https://www.prisma.io/docs/
4. Google Gemini API Documentation (2026). _Multimodal Extraction and Vision Prompting Guides_. https://ai.google.dev/
5. LangChain Documentation (2026). _Retrieval-Augmented Generation Pipelines_. https://python.langchain.com/
6. ChromaDB Documentation (2026). _Vector Store Operations_. https://docs.trychroma.com/
7. Razorpay Documentation (2026). _Payment Gateway Integration_. https://razorpay.com/docs/
8. React Documentation (2026). _React 19 Features_. https://react.dev/
9. Robertson, S., & Zaragoza, H. (2009). _The Probabilistic Relevance Framework: BM25 and Beyond_. Foundations and Trends in Information Retrieval.
10. Sentence-Transformers Documentation (2026). _all-MiniLM-L6-v2 Model Card_. https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2

---

# Appendix A: Complete API Endpoint Reference

## Authentication

| Method | Endpoint           | Auth   | Description                  |
| ------ | ------------------ | ------ | ---------------------------- |
| POST   | /api/auth/register | Public | Register customer/wholesaler |
| POST   | /api/auth/login    | Public | Login and receive JWT        |
| POST   | /api/auth/logout   | Bearer | Blacklist current token      |
| GET    | /api/auth/profile  | Bearer | Get user profile             |

## Products

| Method | Endpoint                  | Auth                            | Description            |
| ------ | ------------------------- | ------------------------------- | ---------------------- |
| GET    | /api/products/            | Bearer (Wholesaler)             | List seller's products |
| POST   | /api/products/            | Bearer (Operational Wholesaler) | Create product         |
| GET    | /api/products/marketplace | Optional                        | Public product listing |
| GET    | /api/products/:id         | Optional                        | Product details        |
| PUT    | /api/products/:id         | Bearer (Operational Wholesaler) | Update product         |
| POST   | /api/products/:id/reviews | Bearer                          | Add review             |

## Cart

| Method | Endpoint            | Auth              | Description     |
| ------ | ------------------- | ----------------- | --------------- |
| GET    | /api/cart/          | Bearer (Customer) | Get cart        |
| POST   | /api/cart/items     | Bearer (Customer) | Add item        |
| PATCH  | /api/cart/items/:id | Bearer (Customer) | Update quantity |
| DELETE | /api/cart/items/:id | Bearer (Customer) | Remove item     |
| DELETE | /api/cart/          | Bearer (Customer) | Clear cart      |

## Orders

| Method | Endpoint                                                              | Auth                | Description               |
| ------ | --------------------------------------------------------------------- | ------------------- | ------------------------- |
| POST   | /api/orders/checkout                                                  | Bearer              | COD/Credit checkout       |
| POST   | /api/orders/prepaid/create                                            | Bearer              | Initiate prepaid checkout |
| POST   | /api/orders/prepaid/verify                                            | Bearer              | Verify Razorpay payment   |
| GET    | /api/orders/                                                          | Bearer              | List orders (role-scoped) |
| PUT    | /api/orders/:id/status                                                | Bearer (Wholesaler) | Update order status       |
| POST   | /api/orders/:id/items/:itemId/cancel                                  | Bearer (Customer)   | Cancel item               |
| POST   | /api/orders/:id/items/:itemId/retry-refund                            | Bearer (Customer)   | Retry refund              |
| POST   | /api/orders/:id/items/:itemId/request-return                          | Bearer (Customer)   | Request return            |
| POST   | /api/orders/:id/items/:itemId/approve-return                          | Bearer (Wholesaler) | Approve return            |
| POST   | /api/orders/:id/items/:itemId/reject-return                           | Bearer (Wholesaler) | Reject return             |
| POST   | /api/orders/:id/items/:itemId/receive-return                          | Bearer (Wholesaler) | Receive return            |
| POST   | /api/orders/:id/items/:itemId/retry-return-refund                     | Bearer (Wholesaler) | Retry return refund       |
| POST   | /api/orders/:orderId/items/:itemId/disputes                           | Bearer (Customer)   | Open dispute              |
| PATCH  | /api/orders/:orderId/items/:itemId/disputes/:disputeId/status         | Bearer (Wholesaler) | Move to review            |
| PATCH  | /api/orders/:orderId/items/:itemId/disputes/:disputeId/resolve        | Bearer (Wholesaler) | Resolve dispute           |
| POST   | /api/orders/:orderId/items/:itemId/disputes/:disputeId/internal-notes | Bearer (Wholesaler) | Add note                  |
| POST   | /api/orders/razorpay/webhook                                          | Public (Signature)  | Razorpay webhooks         |

## Inventory

| Method | Endpoint        | Auth                            | Description     |
| ------ | --------------- | ------------------------------- | --------------- |
| POST   | /api/inventory/ | Bearer (Operational Wholesaler) | Adjust stock    |
| GET    | /api/inventory/ | Bearer (Operational Wholesaler) | View audit logs |

## Ledger

| Method | Endpoint                 | Auth                            | Description           |
| ------ | ------------------------ | ------------------------------- | --------------------- |
| POST   | /api/ledger/payment      | Bearer (Operational Wholesaler) | Record payment        |
| GET    | /api/ledger/             | Bearer (Operational Wholesaler) | All entries           |
| GET    | /api/ledger/my-ledger    | Bearer                          | Customer's own ledger |
| GET    | /api/ledger/user/:userId | Bearer (Operational Wholesaler) | Customer ledger       |

## AI Khatta

| Method | Endpoint            | Auth                          | Description         |
| ------ | ------------------- | ----------------------------- | ------------------- |
| POST   | /api/khatta/process | Bearer (Wholesaler + Feature) | OCR scan image      |
| POST   | /api/khatta/save    | Bearer (Wholesaler + Feature) | Save parsed entries |

## Recommendations

| Method | Endpoint                                          | Auth                      | Description         |
| ------ | ------------------------------------------------- | ------------------------- | ------------------- |
| GET    | /api/recommendations/products/:id/similar         | Optional                  | Similar products    |
| GET    | /api/recommendations/user                         | Bearer                    | Personalized feed   |
| GET    | /api/recommendations/popular                      | Optional                  | Trending/popular    |
| GET    | /api/recommendations/analytics                    | Bearer (Wholesaler/Admin) | Analytics dashboard |
| GET    | /api/recommendations/health                       | Bearer (Wholesaler/Admin) | System health       |
| GET    | /api/recommendations/evaluation                   | Bearer (Admin)            | Run benchmarks      |
| POST   | /api/recommendations/maintenance/clear-logs       | Bearer (Admin)            | Clear logs          |
| POST   | /api/recommendations/maintenance/reset-evaluation | Bearer (Admin)            | Reset evaluations   |
| POST   | /api/recommendations/maintenance/reset-analytics  | Bearer (Admin)            | Reset analytics     |

## Interactions

| Method | Endpoint                                | Auth   | Description      |
| ------ | --------------------------------------- | ------ | ---------------- |
| POST   | /api/interactions/                      | Bearer | Log interaction  |
| POST   | /api/interactions/recommendation-event  | Bearer | Single rec event |
| POST   | /api/interactions/recommendation-events | Bearer | Batch rec events |

## Addresses

| Method | Endpoint                           | Auth              | Description    |
| ------ | ---------------------------------- | ----------------- | -------------- |
| GET    | /api/addresses/                    | Bearer (Customer) | List addresses |
| GET    | /api/addresses/pincode/:postalCode | Bearer (Customer) | Lookup pincode |
| POST   | /api/addresses/                    | Bearer (Customer) | Create address |
| PUT    | /api/addresses/:id                 | Bearer (Customer) | Update address |
| DELETE | /api/addresses/:id                 | Bearer (Customer) | Delete address |
| PATCH  | /api/addresses/:id/default         | Bearer (Customer) | Set default    |

## Stats

| Method | Endpoint                      | Auth                          | Description        |
| ------ | ----------------------------- | ----------------------------- | ------------------ |
| GET    | /api/stats/wholesaler-summary | Bearer (Wholesaler)           | Debt/collection    |
| GET    | /api/stats/advisor-context    | Bearer (Wholesaler)           | AI advisor metrics |
| GET    | /api/stats/advanced-summary   | Bearer (Wholesaler)           | Charts data        |
| GET    | /api/stats/analytics-overview | Bearer (Wholesaler + Feature) | Full analytics     |

## Subscriptions

| Method | Endpoint                            | Auth                | Description     |
| ------ | ----------------------------------- | ------------------- | --------------- |
| GET    | /api/subscriptions/plans            | Bearer (Wholesaler) | Available plans |
| GET    | /api/subscriptions/me               | Bearer (Wholesaler) | Current status  |
| GET    | /api/subscriptions/payments         | Bearer (Wholesaler) | Billing history |
| POST   | /api/subscriptions/checkout         | Bearer (Wholesaler) | Create payment  |
| POST   | /api/subscriptions/verify           | Bearer (Wholesaler) | Verify payment  |
| POST   | /api/subscriptions/trial/start      | Bearer (Wholesaler) | Start trial     |
| POST   | /api/subscriptions/coupons/validate | Bearer (Wholesaler) | Validate coupon |
| POST   | /api/subscriptions/coupons/activate | Bearer (Wholesaler) | Activate coupon |

## B2B Commerce

| Method | Endpoint                                         | Auth                | Description           |
| ------ | ------------------------------------------------ | ------------------- | --------------------- |
| POST   | /api/b2b/register                                | Bearer              | Submit B2B profile    |
| GET    | /api/b2b/applications                            | Bearer (Admin)      | View applications     |
| POST   | /api/b2b/admin/approve/:id                       | Bearer (Admin)      | Approve/reject        |
| POST   | /api/b2b/rfq                                     | Bearer              | Create RFQ            |
| GET    | /api/b2b/rfq                                     | Bearer              | List RFQs             |
| PATCH  | /api/b2b/rfq/:id                                 | Bearer (Wholesaler) | Respond to RFQ        |
| POST   | /api/b2b/rfq/:id/accept                          | Bearer              | Accept quote          |
| POST   | /api/b2b/rfq/:id/buyer-respond                   | Bearer              | Buyer counter/decline |
| POST   | /api/b2b/products/:id/tiers                      | Bearer (Wholesaler) | Set price tiers       |
| GET    | /api/b2b/wholesaler/buyers                       | Bearer (Wholesaler) | List B2B buyers       |
| POST   | /api/b2b/wholesaler/buyers/:buyerId/credit-limit | Bearer (Wholesaler) | Set credit limit      |
| GET    | /api/b2b/buyer/credit-limits                     | Bearer              | Buyer credit status   |

## Super Admin

| Method | Endpoint                                       | Auth           | Description          |
| ------ | ---------------------------------------------- | -------------- | -------------------- |
| GET    | /api/admin/stats                               | Bearer (Admin) | Global stats         |
| GET    | /api/admin/wholesalers                         | Bearer (Admin) | All wholesalers      |
| GET    | /api/admin/wholesalers/pending                 | Bearer (Admin) | Pending applications |
| GET    | /api/admin/wholesalers/:wholesalerId           | Bearer (Admin) | Tenant details       |
| POST   | /api/admin/wholesalers/:wholesalerId/approve   | Bearer (Admin) | Approve              |
| POST   | /api/admin/wholesalers/:wholesalerId/reject    | Bearer (Admin) | Reject               |
| POST   | /api/admin/wholesalers/:wholesalerId/lifecycle | Bearer (Admin) | Suspend/activate     |
| GET    | /api/admin/subscriptions/plans                 | Bearer (Admin) | Plan catalog         |
| GET    | /api/admin/coupons                             | Bearer (Admin) | List coupons         |
| POST   | /api/admin/coupons                             | Bearer (Admin) | Create coupon        |
| DELETE | /api/admin/coupons/:id                         | Bearer (Admin) | Delete coupon        |

## AI Service (FastAPI — Port 8000)

| Method | Endpoint            | Description               |
| ------ | ------------------- | ------------------------- |
| GET    | /health             | Service health check      |
| POST   | /chat               | RAG advisor query         |
| POST   | /ingest             | Ingest PDF knowledge base |
| GET    | /history/:sessionId | Get conversation history  |

---

# Appendix B: Viva Voce Preparation

## Q1: Why did you choose a hybrid recommendation system instead of a single algorithm?

**Answer:** Individual algorithms have specific weaknesses. Collaborative filtering suffers from cold-start (new products/users get no recommendations). Content-based filtering over-specializes within existing tastes. Popularity ranking lacks personalization. By combining all three with weighted scores (content=0.45, collaborative=0.30, popularity=0.20, review=0.05), NexCart provides relevant recommendations under all data availability conditions. Content similarity handles new products immediately via metadata, collaborative captures behavioral patterns from existing users, and popularity ensures trending items always appear.

## Q2: How does the system prevent overselling under concurrent checkout load?

**Answer:** NexCart uses Prisma's `$transaction()` with conditional atomic updates:

```javascript
const result = await tx.product.updateMany({
  where: { id: productId, currentStock: { gte: quantity } },
  data: { currentStock: { decrement: quantity } },
});
if (result.count === 0) throw Error('Out of stock');
```

The `WHERE currentStock >= quantity` condition is checked atomically by PostgreSQL. If multiple concurrent requests try to buy the last unit, only one succeeds (count=1), and the others get count=0, triggering a transaction rollback.

## Q3: Explain the 0.55 confidence threshold in the RAG advisor.

**Answer:** When a user asks a question, the system performs semantic search against ChromaDB. The best matching document receives a relevance score (0-1). If this score is below 0.55, it means no document in the knowledge base is sufficiently related to the query. Rather than passing irrelevant context to the LLM (which would cause hallucinated advice), the system returns a predefined fallback message: "I do not have enough information in the knowledge base to answer that question confidently." This prevents the advisor from giving incorrect business guidance.

## Q4: How does the AI Khatta tool handle duplicate receipt uploads?

**Answer:** The system operates in two phases. Phase 1 (OCR processing) is stateless—it just returns parsed JSON. Phase 2 (database save) uses a transactional approach where entries are validated against existing customer emails. For true idempotency at the ledger level, the system can be configured with unique `idempotencyKey` fields on `LedgerEntry` based on transaction details, preventing duplicate entries from network retries.

## Q5: Explain the B2B credit limit checkout validation.

**Answer:** When a B2B buyer checks out with LEDGER_CREDIT payment method, the system:

1. Verifies the buyer has an APPROVED, ACTIVE business profile
2. For each seller in the cart, fetches the `WholesalerCreditLimit` record
3. Calculates current outstanding: `balance < 0 ? -balance : 0`
4. Checks: `currentOutstanding + orderTotal ≤ creditLimit`
5. If exceeded, returns a detailed error with available credit per seller
   This prevents over-extension of trade credit while allowing B2B transactions within approved limits.

## Q6: How does the subscription feature gating work?

**Answer:** The system uses a middleware chain: `authenticate → requireWholesaler → requireWholesalerFeature('featureName')`. The feature access middleware:

1. Gets the current active subscription from the wholesaler's subscription chain
2. Checks the subscription plan's `features` JSON field (e.g., `{analytics: true, advisor: false}`)
3. If the feature is `true`, the request proceeds; otherwise returns 403 with feature access details
   This means routes like `/api/khatta/process` are only accessible to PREMIUM subscribers who have `khatta: true` in their plan.

## Q7: Describe the hybrid retrieval strategy in the AI advisor.

**Answer:** The retrieval service combines two complementary search methods:

- **Semantic Search (70% weight):** ChromaDB cosine similarity using sentence-transformer embeddings. Finds contextually relevant content even with different vocabulary.
- **Keyword Search (30% weight):** BM25Okapi term-frequency matching cached in memory. Catches exact term matches that vector search might miss.

Results are fused: `combined_score = semantic × 0.7 + keyword × 0.3`, sorted by combined score, and top-K selected. The BM25 cache is rebuilt in-memory only on document ingestion, eliminating repeated computation.

## Q8: How does the order return refund workflow handle partial returns?

**Answer:** Returns are item-level, not order-level. Each `OrderItem` independently tracks:

- `returnStatus`: NONE → REQUESTED → APPROVED → RECEIVED → RETURN_COMPLETED
- `returnRefundStatus`: NONE → PENDING → PROCESSING → SUCCESS/FAILED
- `returnedQuantity`: Allows partial quantity returns
- `refundAmountSnapshot`: Calculated as `unitPrice × returnedQuantity`

When all active items in an order reach RETURN_COMPLETED, the order status is automatically updated to RETURN_COMPLETED. Financial adjustments are tracked via `OrderAdjustment` records with unique `referenceKey` values to prevent duplicate refund processing.

## Q9: What happens when a Razorpay webhook arrives after a manual retry?

**Answer:** The system handles this through idempotent state transitions:

- If an item's `refundStatus` is already REFUNDED with a matching `refundReference`, the webhook update is skipped (no state change).
- The `refreshOrderPaymentStatus()` function derives the aggregate order payment status from individual item states, ensuring consistency regardless of which update (webhook or manual retry) arrives first.
- Razorpay refund IDs starting with `rfnd_` are treated as trusted references, preventing false-negative detection.

## Q10: How does real-time recommendation updating work when a product is edited?

**Answer:** When a product is created or updated via `productController.js`, it calls `queueProductRecommendationUpdate(productId)` which asynchronously (non-blocking) invokes `updateSingleProductContentRecommendations()`. This function:

1. Recomputes the TF-IDF vector for just the modified product
2. Calculates its cosine similarity against all existing product feature vectors
3. Updates forward similarities (modified product → others) by replacing its top-K entries
4. Updates reverse similarities (others → modified product) only where the new score would displace an existing top-K entry
   This ensures the similarity index stays current without requiring a full expensive rebuild.

---

_End of Report_
