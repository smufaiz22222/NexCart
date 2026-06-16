# NexCart Agent Guidelines & Internal AI Reference

This document serves two primary purposes:

1. **Developer Agent Handbook**: Guides autonomous AI coding assistants (like Gemini, ChatGPT, or Cursor) in navigating, modifying, and testing the NexCart codebase safely.
2. **Internal AI Systems Specification**: Details the internal AI engines (Hybrid Recommendations, RAG Business Advisor, and AI Khatta Vision Parser).

---

## 1. Developer Agent Handbook

### 1.1 Core Codebase Structure

```txt
c:\Users\smufa\Desktop\NexCart_updated\
├── backend/
│   ├── prisma/             # Schema definition and seed scripts
│   └── src/
│       ├── config/         # Database and third-party API configurations
│       ├── controllers/    # API endpoint business logic
│       ├── jobs/           # Offline recommendation pre-computation scripts
│       ├── middlewares/    # Authentication and role guards
│       ├── routes/         # Express router endpoints
│       └── services/       # Recommendation engine & helper utilities
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios API clients
│   │   ├── components/     # Reusable UI elements
│   │   ├── layouts/        # Page layout configurations (Customer, Wholesaler)
│   │   ├── pages/          # Full page views (Storefront, Ledger, Khatta, Advisor)
│   │   └── store/          # Zustand global state modules
├── ai-service/
│   └── app/
│       ├── docs/           # Knowledge base documents for RAG (PDFs)
│       ├── memory/         # Session history buffers
│       ├── routes/         # FastAPI endpoints (chat, history, ingest)
│       ├── services/       # Prompt builder and model utilities
│       └── vectorstore/    # Chroma DB connectors
```

### 1.2 Tech Stack Reference

- **Frontend**: React (v19), React Router DOM (v7), Zustand (v5) for state, and Tailwind CSS (v4) with Lucide React icons.
- **Backend**: Express.js (v5), Prisma ORM (v6), PostgreSQL database.
- **AI Service**: Python (v3.10+), FastAPI, LangChain, ChromaDB, and `sentence-transformers` for embeddings.
- **AI Providers**: Google Generative AI (Gemini API) used in both Express (Khatta scan) and Python (Business Advisor).

### 1.3 Rules of Engagement for Coding Agents

When updating files or implementing features, you must follow these rules:

1.  **Prisma Client Generation**: The Prisma Client in `backend` is configured to write to a custom location: `src/generated/client` (defined in [schema.prisma](file:///c:/Users/smufa/Desktop/NexCart_updated/backend/prisma/schema.prisma#L3)). Always import from `../config/db.js` or directly from the generated path rather than the default `@prisma/client`.
2.  **Tailwind CSS Version 4**: The frontend uses Tailwind CSS v4. Do not import Tailwind configuration files using v3 patterns. Styling should be handled using utility classes directly in `className` tags.
3.  **Preserve State Persistence**: Frontend authentication is managed via Zustand store in [authStore.js](file:///c:/Users/smufa/Desktop/NexCart_updated/frontend/src/store/authStore.js), which synchronizes with local storage. Ensure state-altering changes don't break persistence.
4.  **Formatting and Linting**: Run formatting and linting checks inside backend/frontend directories before concluding changes:
    - **Frontend lint check**: `npm run lint`
    - **Frontend formatting**: `npm run format`
    - **Backend lint check**: `npm run lint`
    - **Backend formatting**: `npm run format`
5.  **Syntax Verification (PowerShell/Windows)**: Verify file syntax after refactoring backend JS files:
    ```powershell
    Get-ChildItem -Path src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
    ```

### 1.4 Architectural Guardrails & Coding Principles

AI Agents MUST follow these code design patterns and guardrails when making changes to the repository:

1.  **KISS (Keep It Simple, Stupid)**:
    - Avoid complex meta-programming or dynamic abstractions where a basic conditional statement or direct function call suffices.
    - Keep React component trees shallow. Deconstruct long UI segments into clearly named helper functions or subcomponents.
2.  **DRY (Don't Repeat Yourself)**:
    - Common behaviors (e.g., currency formatting, auth checks, database connection setup) should be defined once.
    - Utilize the standard utility functions under `backend/src/utils/` and client wrappers in `frontend/src/api/`. Do not write duplicate axios instances or local helper copies.
3.  **Reusability**:
    - Design UI components modularly. Use flexible parameters (`props`) to make buttons, inputs, filters, or cards reusable across layouts.
    - Encapsulate repeating API call routines inside custom React hooks or Zustand action functions to make logic reusable.
4.  **YAGNI (You Aren't Gonna Need It)**:
    - Do not write code for hypothetical future requirements. Implement strictly what the task demands.
    - Do not add unused schema columns, redundant API responses, or speculative configuration files.
5.  **NexCart Code Design Patterns**:
    - **Transactional Safety**: Database operations affecting multiple tables (e.g., updating stock logs and adjusting balances during a sale) MUST be wrapped in a Prisma PostgreSQL transaction (`prisma.$transaction`).
    - **Controller-Service Separation**: Keep routes thin. Route files should only point to controller functions. Complex operations (like TF-IDF score calculation or collaborative filtering computations) belong in `src/services/` or `src/jobs/`.
    - **Tailwind CSS Utility Control**: Manage styles exclusively using Tailwind's core utility classes or custom theme configuration variables. Inline style mappings (`style={{...}}`) are strictly forbidden.
    - **Class Merging (clsx & tailwind-merge)**: When constructing dynamic or conditional className strings in React components, always utilize the `cn` class merger helper found in [cn.js](file:///c:/Users/smufa/Desktop/NexCart_updated/frontend/src/utils/cn.js). Avoid raw string interpolations or conditional string concatenations.
    - **Selective Memoization**: Avoid using memoization hooks (`useMemo`, `useCallback`, `memo`) unless rendering is proven to be computationally expensive (e.g., sorting or filtering large data arrays) or when reference preservation is critical for dependency arrays. Standard rendering routines and simple inline calculations do not require memoization.
    - **Authentication & Role Protection**: Always verify authorization state. Endpoint routes must utilize the appropriate authentication and role checks (`authenticate`, `requireWholesaler`, `requireSuperAdmin`) to block unauthorized access.

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

1.  **Content-Based Engine** (`buildContentRecommendations.js`):
    - Preprocesses product metadata (name, description, wholesaler name, category, SKU, sizes) into a unified corpus.
    - Computes TF-IDF term frequencies and stores similarities in the `ProductSimilarity` database table.
2.  **Collaborative Filtering Engine** (`buildCollaborativeRecommendations.js`):
    - Performs item-based collaborative filtering by analyzing customer interaction vectors (weights: `view=1`, `wishlist=2`, `cart=3`, `purchase=5`).
3.  **Popularity & Recency Ranking** (`buildPopularityRecommendations.js`):
    - Ranks products using total weights combined with exponential time-decay:
      $$\text{Decay} = 0.5^{\frac{\text{Age in Days}}{\text{Half-life (30 days)}}}$$
4.  **Attribution Pipeline**:
    - Stores recommendation impressions in `RecommendationLog`.
    - Captures subsequent interactions inside `RecommendationEvent` using `recommendationLogId` attributes to compute Click-Through Rate (CTR) and conversion indexes.

### 3.2 AI Business Advisor (RAG Agent)

A retrieval-augmented FastAPI service helps wholesalers scale their businesses using documentation guides:

- **Ingestion Pipeline**: Loads documentation from `./app/docs/` utilizing LangChain's `PyPDFDirectoryLoader`. Splits text pages using `RecursiveCharacterTextSplitter` (chunk size: `800`, overlap: `100`), normalizes page-number metadata, and stores chunks inside a local Chroma vector database (`./chroma_db`).
- **Retrieval Logic**: When a user queries, it queries Chroma DB using sentence-transformer embeddings. If the cosine distance score is below the confidence threshold (`MIN_RETRIEVAL_SCORE=0.55`), it defaults to generic model instructions or notifies the user of sparse facts.
- **Prompt Architecture**: Prompts are dynamically structured using history logs, rule engines, custom context summaries, and retrieve-chunks before being passed to Google Gemini models via LangChain (`langchain-google-genai`).

### 3.3 AI Khatta Digitizer (Vision Scan)

Enables quick digitizing of handwritten billing books or invoice printouts:

1.  **Image Upload**: The frontend [AiKhatta.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/frontend/src/pages/AiKhatta.jsx) converts the selected image file to base64 format and posts it to `/api/khatta/process`.
2.  **Vision LLM Processing**: The Express controller [khattaController.js](file:///c:/Users/smufa/Desktop/NexCart_updated/backend/src/controllers/khattaController.js) invokes `gemini-2.5-flash` with a structured system prompt, extracting an structured JSON containing customer email guesses, transaction amounts, notes, and subtotal metrics.
3.  **Ledger Integration**: The user reviews the extracted rows on screen and sends them to `/api/khatta/save`. The backend runs a PostgreSQL transaction matching customer emails to registered user profiles and writes ledger rows (`LedgerEntry`) linked to the active Wholesaler.
