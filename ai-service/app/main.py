# ruff: noqa: E402
from pathlib import Path

from dotenv import load_dotenv

SERVICE_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = Path(__file__).resolve().parents[2]

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(SERVICE_DIR / ".env", override=True)

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.chat import router as chat_router
from app.routes.history import router as history_router
from app.routes.ingest import router as ingest_router
from app.embeddings.embedder import get_embedder


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: pre-load embedding model weights to eliminate first-query cold-start
    print("[Lifespan] Pre-loading embedding model...")
    get_embedder()
    print("[Lifespan] Embedding model ready.")
    yield
    # Shutdown: nothing to clean up


app = FastAPI(title="NexCart AI Business Advisor", lifespan=lifespan)

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "AI_CORS_ORIGINS", "http://localhost:5173,http://localhost:4173"
    ).split(",")
    if origin.strip()
]

if not cors_origins:
    raise RuntimeError(
        "AI_CORS_ORIGINS must contain at least one allowed origin when credentials are enabled."
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(history_router)
app.include_router(ingest_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "NexCart AI"}
