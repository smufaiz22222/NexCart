# ruff: noqa: E402
from dotenv import load_dotenv

load_dotenv()  # must be first line before any other imports

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["*"],
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
