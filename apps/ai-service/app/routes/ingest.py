# ingest.py — FIXED
# Added deduplication: collection is cleared before each ingestion run.
# This prevents duplicate chunks from accumulating if /ingest is called multiple times.
# 
# Two strategies available — choose via INGEST_MODE in .env:
#   "replace" (default) — clears collection then re-ingests. Safe and clean.
#   "skip"              — skips ingestion if collection already has documents.

import os
from fastapi import APIRouter, HTTPException
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.services.document_utils import normalize_chunk_metadata
from app.vectorstore.chroma_store import add_documents, get_vectorstore

router = APIRouter()

DOCS_PATH   = os.getenv("DOCS_PATH", "./app/docs")
INGEST_MODE = os.getenv("INGEST_MODE", "replace")  # "replace" or "skip"

@router.post("/ingest")
async def ingest_documents():
    try:
        vectorstore = get_vectorstore()

        # ── Deduplication logic ────────────────────────────────────────────
        existing = vectorstore.get()
        existing_count = len(existing["documents"]) if existing["documents"] else 0

        if INGEST_MODE == "skip" and existing_count > 0:
            return {
                "status": "skipped",
                "reason": f"Collection already has {existing_count} chunks. Set INGEST_MODE=replace to re-ingest.",
                "chunks_stored": existing_count,
            }

        if INGEST_MODE == "replace" and existing_count > 0:
            # Clear the entire collection before re-ingesting
            print(f"[Ingest] Clearing {existing_count} existing chunks before re-ingestion")
            vectorstore.delete_collection()
            print("[Ingest] Collection cleared")

        # ── Load PDFs ──────────────────────────────────────────────────────
        print(f"[Ingest] Loading PDFs from: {DOCS_PATH}")
        loader = PyPDFDirectoryLoader(DOCS_PATH)
        raw_docs = loader.load()

        if not raw_docs:
            raise HTTPException(
                status_code=400,
                detail=f"No PDF files found in {DOCS_PATH}. Add PDFs and retry."
            )

        print(f"[Ingest] Loaded {len(raw_docs)} pages")

        # ── Split into chunks ──────────────────────────────────────────────
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=100,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        chunks = splitter.split_documents(raw_docs)
        for chunk in chunks:
            chunk.metadata = normalize_chunk_metadata(chunk.metadata, page_is_zero_based=True)
        print(f"[Ingest] Split into {len(chunks)} chunks")

        # ── Store in ChromaDB ──────────────────────────────────────────────
        add_documents(chunks)

        return {
            "status": "success",
            "pages_loaded": len(raw_docs),
            "chunks_stored": len(chunks),
            "message": "Knowledge base is ready.",
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Ingest] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
