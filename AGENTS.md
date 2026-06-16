# NexCart Agent Guidelines & Internal AI Reference

This document serves two primary purposes:

1. **Developer Agent Handbook**: Guides autonomous AI coding assistants (like Gemini, ChatGPT, or Cursor) in navigating, modifying, and testing the NexCart codebase safely.
2. **Internal AI Systems Specification**: Details the internal AI engines (Hybrid Recommendations, RAG Business Advisor, and AI Khatta Vision Parser).

---

## 1. Developer Agent Handbook

### 1.1 Core Codebase Structure

```txt
./
├── client/                 # React frontend application
│   ├── src/
│   │   ├── api/            # Axios API clients
│   │   ├── components/     # Reusable UI elements
│   │   ├── layouts/        # Page layout configurations
│   │   ├── pages/          # Full page views
│   │   └── store/          # Zustand global state modules
├── src/                    # Express server source
│   ├── config/             # Database and third-party API configurations
│   ├── controllers/        # API endpoint business logic
│   ├── jobs/               # Offline recommendation scripts
│   ├── middlewares/        # Auth and role guards
│   ├── routes/             # Express router endpoints
│   └── services/           # Business logic & recommendation engines
├── prisma/                 # Schema definition and seed scripts
├── ai-service/             # Python FastAPI service (RAG Advisor)
│   └── app/
│       ├── docs/           # Knowledge base documents (PDFs)
│       ├── routes/         # FastAPI endpoints
│       └── vectorstore/    # Chroma DB connectors
├── docs/                   # Technical reports & documentation
└── package.json            # Root-level unified scripts
```

### 1.2 Tech Stack Reference

- **Frontend**: React (v19), Zustand (v5), Tailwind CSS (v4).
- **Backend**: Node.js, Express.js (v5), Prisma ORM (v6), PostgreSQL.
- **AI Service**: Python (v3.10+), FastAPI, LangChain, ChromaDB.
- **AI Providers**: Google Gemini API.

### 1.3 Rules of Engagement for Coding Agents

1.  **Unified Management**: The project is managed from the root. Use `pnpm run dev` to start both frontend and backend.
2.  **Prisma Client**: The Prisma Client is generated into `src/generated/client`. Always import from `src/config/db.js`.
3.  **Tailwind CSS v4**: Styling is handled via utility classes directly in `className`.
4.  **Formatting & Linting**:
    - Web App: `pnpm run lint`, `pnpm run format`
    - Client: `pnpm --filter frontend lint`, `pnpm --filter frontend format`
    - AI Service: `pnpm run lint:ai`, `pnpm run format:ai`
5.  **Syntax Verification**:
    ```powershell
    Get-ChildItem -Path src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
    ```

### 1.4 Architectural Guardrails

- **Transactional Safety**: Use `prisma.$transaction` for multi-table updates.
- **Controller-Service Separation**: Keep routes thin; logic belongs in services or jobs.
- **Class Merging**: Use the `cn` helper from `client/src/utils/cn.js`.
- **Auth Protection**: Use `authenticate`, `requireWholesaler`, `requireSuperAdmin` middlewares.

---

## 2. Database Schema Quick-Reference

Key relationships to note when writing Prisma queries:

- **Roles**: Users are divided into `CUSTOMER`, `WHOLESALER`, and `SUPER_ADMIN`.
- **Wholesaler Profiles**: A `User` with role `WHOLESALER` has a one-to-one link to a `Wholesaler` profile.
- **Inventory Logging**: Changes to product quantities are recorded in `InventoryLog` tracking actions (`SALE`, `REFUND`, `OCR_UPDATE`, `MANUAL_ADJUSTMENT`, etc.).
- **Ledger Entries**: `LedgerEntry` links a transaction from a `Wholesaler` to a specific customer `User` (`userId` field).
- **Recommendation Attribution**: Product interaction tracking is handled in `RecommendationInteraction` (actions: `view`, `wishlist`, `cart`, `purchase`, `review`), which can be linked to a `RecommendationLog` to attribute e-commerce metrics.

---

## 3. Internal AI Systems Reference

### 3.1 Hybrid Recommendation Engine

NexCart builds a consolidated rank list by scoring and weighting three algorithms:

1.  **Content-Based Engine** (`src/jobs/buildContentRecommendations.js`):
    - Preprocesses product metadata into a unified corpus.
    - Computes TF-IDF term frequencies and stores similarities in `ProductSimilarity`.
2.  **Collaborative Filtering Engine** (`src/jobs/buildCollaborativeRecommendations.js`):
    - Performs item-based collaborative filtering by analyzing customer interaction vectors.
3.  **Popularity & Recency Ranking** (`src/jobs/buildPopularityRecommendations.js`):
    - Ranks products using total weights combined with exponential time-decay.
4.  **Attribution Pipeline**:
    - Stores recommendation impressions in `RecommendationLog`.

### 3.2 AI Business Advisor (RAG Agent)

A retrieval-augmented FastAPI service helps wholesalers scale their businesses:

- **Ingestion Pipeline**: Loads documentation from `ai-service/app/docs/`. Stores chunks in `ai-service/chroma_db`.
- **Retrieval Logic**: Uses sentence-transformer embeddings with a confidence threshold.
- **Prompt Architecture**: Uses LangChain and Google Gemini models.

### 3.3 AI Khatta Digitizer (Vision Scan)

Enables quick digitizing of handwritten billing books:

1.  **Image Upload**: The frontend `client/src/pages/AiKhatta.jsx` posts to `/api/khatta/process`.
2.  **Vision LLM Processing**: The Express controller `src/controllers/khattaController.js` invokes Gemini Vision models.
3.  **Ledger Integration**: Extracted rows are reviewed and saved as `LedgerEntry`.
