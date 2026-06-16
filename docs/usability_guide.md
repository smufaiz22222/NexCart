# NexCart Developer Usability Guide

This guide covers local environment setup, startup instructions, database management commands, recommendation scripts, and code quality verification checklists.

---

## 1. Prerequisites & Environment Setup

Ensure you have the following installed:

- **Node.js**: v18+ (tested on Node 20)
- **Python**: v3.10+
- **PostgreSQL**: Local or hosted instance (running on port 5433 by default in templates)

### 1.1 Local Workspace Configuration

Verify that your root directory has the following structure:

```txt
NexCart_updated/
├── client/         # Frontend
├── prisma/         # Database schema
├── src/            # Backend API
├── ai-service/     # AI Service
└── package.json    # Root scripts
```

Ensure your backend `.env` variables match the local settings:

```properties
DATABASE_URL="postgresql://postgres:qwerty@localhost:5433/nexcart_db?schema=public"
JWT_SECRET=your_super_secret_jwt_key_here
PORT=5000
GEMINI_API_KEY=your_gemini_api_key
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

Ensure your AI service `.env` variables are configured:

```properties
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash
DOCS_PATH=./app/docs
CHROMA_PATH=./chroma_db
INGEST_MODE=replace
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
MIN_RETRIEVAL_SCORE=0.55
MAX_CITATIONS=5
RETRIEVAL_TOP_K=5
AI_CORS_ORIGINS=http://localhost:5173,http://localhost:4173
```

---

## 2. Step-by-Step Installation

### 2.1 Web Application (Backend + Frontend) Setup

1.  Install dependencies:
    ```bash
    npm install
    npm run client:install
    ```
2.  Apply Prisma schemas and generate the query client:
    ```bash
    npx prisma db push
    npx prisma generate
    ```
3.  Seed base developer/roles datasets:
    ```bash
    npx prisma db seed
    ```

### 2.2 AI Service (FastAPI) Setup

1.  Navigate and create virtual environment:
    ```bash
    cd ai-service
    python -m venv .venv
    ```
2.  Activate virtual environment:
    - **Windows (CMD)**: `.venv\Scripts\activate`
    - **Windows (PowerShell)**: `.venv\Scripts\activate.ps1`
    - **Linux/macOS**: `source .venv/bin/activate`
3.  Install requirements:
    ```bash
    pip install -r requirements.txt
    ```

---

## 3. Running the Services

### 3.1 VS Code Automated Startup

Open the workspace directory in VS Code. The **Backend** and **Frontend** servers will automatically start up in shared terminals.

- To start the **AI Service**, run the VS Code task: `Ctrl+Shift+P` -> `Tasks: Run Task` -> `Start AI Service`.

### 3.2 Manual Command Startup

- **All Services (Combined)**: `npm run dev` (Starts backend on port 5000, frontend on port 5173, and AI service on port 8000)
- **Individual AI Service**: `cd ai-service && .venv\Scripts\activate && uvicorn app.main:app --reload --port 8000`

---

## 4. Recommendation System Operations

NexCart requires pre-computing similarity profiles offline or periodically to serve recommendations quickly at runtime.

### 4.1 Seed Recommendation Demonstration Datasets

To populate transactional activities and dummy interactions for recommendations evaluation, run:

```bash
npm run recommendations:seed-demo
```

### 4.2 Run Pre-computation Jobs

Generate similarity matrices and cache them in PostgreSQL:

- **Content Similarity Engine**:
  ```bash
  npm run recommendations:build-content
  ```
- **Collaborative Filtering Engine**:
  ```bash
  npm run recommendations:build-cf
  ```
- **Trending Popularity Decays**:
  ```bash
  npm run recommendations:build-popularity
  ```

### 4.3 Run Offline Benchmarks

Evaluate recommendation quality metrics (Precision@K, Recall@K, NDCG@K, Diversity, Coverage):

```bash
npm run recommendations:benchmark
```

---

## 5. Testing & Code Quality Verification

Follow this checklist before submitting PRs or deploying:

### 5.1 Linting & Formatting Validation

- **Web App Check**:
  ```bash
  npm run lint
  npm run format:check
  npm run lint --prefix client
  npm run format:check --prefix client
  ```
- **Backend Syntax Node Verification**:
  Run inside Windows PowerShell:
  ```powershell
  Get-ChildItem -Path src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
  ```

### 5.2 RAG Knowledge Ingestion

Ensure your AI Advisor has processed reference documents:

1.  Place business manual PDFs inside `ai-service/app/docs/`.
2.  Trigger the ingestion API while the FastAPI server is running:
    - **PowerShell**:
      ```powershell
      Invoke-RestMethod -Uri http://localhost:8000/ingest -Method Post
      ```
    - **cURL**:
      ```bash
      curl -X POST http://localhost:8000/ingest
      ```
3.  Confirm the JSON response yields `"status": "success"` and the loaded page count is non-zero.
