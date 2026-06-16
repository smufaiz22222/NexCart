# NexCart System Architecture Guide

This document describes the structural design, backend data mapping, and API routing architecture of the NexCart e-commerce and wholesaler platform.

---

## 1. System Layers & Data Flow

NexCart is structured as a decoupled, multi-tier application connecting front-end UI clients with transactional relational databases and a vector-based semantic retrieval service.

```mermaid
flowchart TD
  subgraph Client_Layer [Client Layer]
    React["React SPA (Vite + Zustand)"]
  end

  subgraph Service_Layer [Core Backend API]
    Express["Express.js App"]
    PrismaClient["Prisma Client API (src/generated/client)"]
    RecommenderJobs["Recommendation Builders"]
  end

  subgraph Database_Layer [Database Storage]
    Postgres[(PostgreSQL Relational DB)]
  end

  subgraph AI_Layer [Decision Support]
    FastAPI["FastAPI Python Server"]
    Chroma[(ChromaDB Vector Store)]
    LLM["Google Gemini API (Generative AI)"]
  end

  React <-->|HTTP REST / JWT| Express
  React <-->|HTTP REST| FastAPI
  Express <-->|CRUD Query| PrismaClient
  PrismaClient <-->|SQL Client| Postgres
  RecommenderJobs <-->|Build Similarity Matrix| Postgres
  FastAPI <-->|Embedding Vector Search| Chroma
  FastAPI <-->|RAG Prompts & Context| LLM
```

---

## 2. Database Design & Models

The relational database is managed via [schema.prisma](../prisma/schema.prisma) and deployed on PostgreSQL. Key database models and relationships include:

### 2.1 Core Identity & Roles

- **User**: Handles authentication and account management. Has a unique `email` and password. Divides users into one of three roles:
  - `CUSTOMER`: Accesses storefront views, browse suggestions, builds shopping carts, and creates purchases.
  - `WHOLESALER`: Links to a unique **Wholesaler** profile. Manages product inventories, reviews ledger states, and launches the RAG Business Advisor.
  - `SUPER_ADMIN`: Monitors system statistics, offline recommendation quality reports, and clears system cache indices.
- **Wholesaler**: Stores business profiles (e.g. `businessName`). Coordinates relationships with `Product` arrays, `Order` items, `LedgerEntry` summaries, and `InventoryLog` records.

### 2.2 Inventory & E-Commerce Flow

- **Product**: Contains item metadata (name, description, category, size list, stock counts, cost metrics, and prices). Linked to a parent `Wholesaler` provider.
- **InventoryLog**: Tracks stock adjustments. Logs changes with custom types: `SALE`, `REFUND`, `OCR_UPDATE` (from AI Khatta scanner), `MANUAL_ADJUSTMENT`, `CANCELLATION`, or `CUSTOMER_RETURN`. During checkout, stock updates are executed using atomic conditional database operations inside the Prisma transaction so inventory is decremented only when sufficient stock exists. This prevents concurrent checkout attempts from overselling inventory, and if another transaction consumes the remaining stock first, the current checkout fails cleanly and rolls back.
- **Order & OrderItem**: Records buyer-seller checkouts. Tracks `paymentStatus` (COD, Prepaid) and order fulfillment status (PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED).
- **LedgerEntry**: Records accounting histories between a wholesaler and a customer. Tracks credits and debits (`amount`).

### 2.3 Recommendation Attribution Data Models

- **RecommendationInteraction**: Logs individual customer interactions (action types: `view`, `wishlist`, `cart`, `purchase`, `review`). Attributes impressions to a specific recommendation instance via `recommendationId`.
- **ProductFeature**: Stores parsed text corpora (product names, category, size variables) and corresponding pre-computed TF-IDF JSON vectors.
- **ProductSimilarity**: Contains pre-calculated likeness indexes between products, computed using content-based filtering or item collaborative models.
- **RecommendationLog & RecommendationEvent**: Tracks recommendations rendered on the client storefront. Measures event streams (impressions, clicks, add-to-carts, purchases) to calculate CTR and sales conversions.

---

## 3. Core REST API Route Map

### 3.1 Express Backend Routes

All backend routes are prefix-mapped under `/api` inside [index.js](../src/index.js):

| Resource Endpoint          | Middleware / Auth     | Controller Logic              | Description                                                                                                             |
| :------------------------- | :-------------------- | :---------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| **`/api/auth`**            | Public                | `authController.js`           | Handles user registration, JWT login, and session validation.                                                           |
| **`/api/products`**        | Mixed Auth            | `productController.js`        | Fetches listings, reviews, and wholesaler inventories.                                                                  |
| **`/api/inventory`**       | Wholesaler            | `inventoryController.js`      | Modifies product stock levels and appends `InventoryLog` entries.                                                       |
| **`/api/orders`**          | Customer / Wholesaler | `orderController.js`          | Submits checkouts, initializes payments (Razorpay), performs idempotent payment verification, and handles order issues. |
| **`/api/cart`**            | Customer              | `cartController.js`           | Returns and mutates only the authenticated customer's cart; all cart operations enforce ownership checks.               |
| **`/api/ledger`**          | Wholesaler            | `ledgerController.js`         | Fetches transactional ledgers for customer accounts.                                                                    |
| **`/api/khatta`**          | Wholesaler            | `khattaController.js`         | Parses handwritten receipts and saves them as transaction lines.                                                        |
| **`/api/recommendations`** | Customer / Wholesaler | `recommendationController.js` | Returns popular list, similar items, custom customer feed, and offline reports.                                         |

### 3.2 Python AI Service Routes

- **`POST /chat`**: Receives customer query, session identifier, and company statistics context. Classified by prompt rules, executes ChromaDB semantic search, and compiles RAG results from Google Gemini LLM.
- **`POST /ingest`**: Reads PDF documents from `DOCS_PATH`, segments text into chunks using `RecursiveCharacterTextSplitter` (chunk size: 800, overlap: 100), builds embeddings (`sentence-transformers/all-MiniLM-L6-v2`), and indexes them in ChromaDB.
- **`GET /history`**: Returns historical query buffers associated with the user session.

---

## 4. Operational Flows

### 4.1 Recommendation Lifecycle & Event Attribution

```mermaid
sequenceDiagram
  participant User as Customer Browser
  participant App as App Router (Vite Client)
  participant API as Core Express Backend
  participant DB as PostgreSQL Database

  User->>App: Opens Product Details Page
  App->>API: Request Recommendations (GET /api/recommendations/products/:id/similar)
  API->>DB: Read top-similar products from ProductSimilarity
  API->>DB: Create RecommendationLog record (generate logId)
  API-->>App: Return recommended products + recommendationLogId
  App->>User: Render similar products carousel
  App->>API: Log impression events (POST /api/interactions/recommendation-events)

  User->>App: Clicks on similar product card
  App->>API: Log click event with recommendationLogId
  App->>App: Mount product page & store recommendationLogId in memory

  User->>App: Adds item to Cart
  App->>API: Log cart event with recommendationLogId

  User->>App: Completes Checkout
  App->>API: Create Order (attributing purchase to recommendationLogId)
  API->>DB: Atomically decrement stock only if sufficient inventory remains
  API->>DB: Write attributed RecommendationEvent (purchase type)
  Note over API,DB: If another transaction consumes the last stock first, this checkout rolls back cleanly
```

### 4.2 Cart Hydration and Ownership Enforcement

- `GET /api/cart` always returns only the authenticated customer's cart.
- Cart hydration never exposes another customer's cart because cart lookup is scoped to the current authenticated user identity.
- All cart operations (`GET`, `POST`, `PATCH`, `DELETE`) enforce authenticated ownership checks before returning or modifying data.

### 4.3 Razorpay Verification Idempotency

- Razorpay payment verification is keyed by the unique Razorpay payment identifier associated with the checkout session.
- Repeated verification requests for the same successful payment never create duplicate orders.
- When the backend sees a payment that has already been verified successfully, it returns the already-created order instead of executing checkout again.
