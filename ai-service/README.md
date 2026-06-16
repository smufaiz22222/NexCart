# NexCart AI Service

A FastAPI-powered service providing RAG (Retrieval-Augmented Generation) capabilities for the NexCart Business Advisor.

## Tech Stack

- **Framework**: FastAPI
- **LLM Orchestration**: LangChain
- **Vector Database**: ChromaDB
- **Embeddings**: Sentence-Transformers
- **Model**: Google Gemini (via `langchain-google-genai`)

## Setup

### 1. Virtual Environment

```bash
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
.venv\Scripts\activate     # Windows
```

### 2. Dependencies

```bash
pip install -r requirements.txt
```

### 3. Environment Variables

Create a `.env` file:
```properties
GEMINI_API_KEY="your_api_key"
CHROMA_PATH="./chroma_db"
DOCS_PATH="./app/docs"
```

### 4. Running the Service

```bash
uvicorn app.main:app --reload --port 8000
```

## Endpoints

- `POST /ingest`: Processes documents in `app/docs` and populates the vector store.
- `POST /chat`: RAG-enabled chat endpoint for business advice.
- `GET /history`: Retrieves session chat history.
