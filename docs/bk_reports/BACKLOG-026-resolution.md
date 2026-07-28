# BACKLOG-026 Resolution: Hardcoded CPU Devices & Startup Cold-Starts

## Issue Summary

**ID:** BACKLOG-026  
**Category:** AI Service & RAG  
**Priority:** MEDIUM  
**Effort:** S (Small)

## Problem

Two performance issues were present in the embedding model setup:

1. **Hardcoded CPU device**: The embedding model was initialized with `model_kwargs={"device": "cpu"}`, preventing utilization of available GPU hardware (CUDA on NVIDIA systems, MPS on Apple Silicon). In GPU-equipped environments, this forced all embedding computations onto the CPU, significantly slowing down both ingestion and query-time vector operations.

2. **First-query cold-start**: The embedding model weights were loaded lazily on the first query (via `@lru_cache`). While the cache prevents repeated loads, the initial query experienced a several-second delay while model weights downloaded and loaded into memory. This created a poor first-impression for the first user to interact with the advisor after a server restart.

## Resolution

### 1. Dynamic device detection in embedder.py

Replaced the hardcoded `"cpu"` string with a `_detect_device()` function that checks for available hardware accelerators in priority order:

```python
import torch

def _detect_device() -> str:
    """Detect the best available compute device: CUDA > MPS > CPU."""
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"
```

The device detection runs once at model initialization time and the result is logged for observability:

```python
@lru_cache(maxsize=1)
def get_embedder() -> HuggingFaceEmbeddings:
    device = _detect_device()
    print(f"[Embedder] Loading model: {EMBEDDING_MODEL} on device: {device}")
    return HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        model_kwargs={"device": device},
        encode_kwargs={"normalize_embeddings": True},
    )
```

### 2. Lifespan startup warm-call in main.py

Added a FastAPI lifespan context manager that pre-loads the embedding model during server startup, before any traffic is accepted:

```python
from contextlib import asynccontextmanager
from app.embeddings.embedder import get_embedder

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Lifespan] Pre-loading embedding model...")
    get_embedder()
    print("[Lifespan] Embedding model ready.")
    yield

app = FastAPI(title="NexCart AI Business Advisor", lifespan=lifespan)
```

This ensures:

- Model weights are downloaded and loaded into memory at startup.
- The `@lru_cache` is populated before the first user query arrives.
- No user experiences the cold-start delay.

## Files Modified

| File                                    | Change                                                                                            |
| :-------------------------------------- | :------------------------------------------------------------------------------------------------ |
| `ai-service/app/embeddings/embedder.py` | Added `torch` import, `_detect_device()` function, replaced hardcoded `"cpu"` with dynamic device |
| `ai-service/app/main.py`                | Added `asynccontextmanager` lifespan that warm-calls `get_embedder()` on startup                  |

## Device Priority

| Priority | Device | Condition                                                                 |
| :------: | :----- | :------------------------------------------------------------------------ |
|    1     | `cuda` | `torch.cuda.is_available()` returns `True` (NVIDIA GPU with CUDA drivers) |
|    2     | `mps`  | `torch.backends.mps.is_available()` returns `True` (Apple Silicon GPU)    |
|    3     | `cpu`  | Fallback when no GPU is available                                         |

## Verification

- On startup, the server logs show: `[Embedder] Loading model: ... on device: <detected>`
- The first user query responds without cold-start delay since the model is already loaded.
- On GPU-equipped environments, embedding operations use hardware acceleration automatically.
- On CPU-only environments (e.g., development laptops), behavior is unchanged — the model simply loads on CPU as before, but now at startup rather than first query.
