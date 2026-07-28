# BACKLOG-025 Resolution: Redundant On-the-Fly BM25 Index Compilation

## Issue Summary

**ID:** BACKLOG-025  
**Category:** AI Service & RAG  
**Priority:** HIGH  
**Effort:** M (Medium)

## Problem

For every user query, the retrieval service performed the following expensive operations:

1. `get_knowledge_base_state()` fetched **all** documents from the ChromaDB collection.
2. The entire corpus was tokenized in Python (`content.lower().split()` for every document).
3. A new `BM25Okapi` index was built from the tokenized corpus.
4. The index was used for a single query scoring, then immediately discarded.

This meant:

- **O(N) ChromaDB reads** on every chat message, where N = total document chunks.
- **O(N) tokenization** and BM25 index construction CPU cost per query.
- Memory allocation and garbage collection overhead scaling linearly with knowledge base size.
- Response latency growing as more documents are ingested.

## Resolution

Implemented an **in-memory cache** for the BM25 index and document list with a thread-safe invalidation mechanism.

### Architecture

```
┌─────────────────────────────────────────────────┐
│  retrieval_service.py (module-level cache)       │
│                                                  │
│  _cached_documents: list[Document]               │
│  _cached_bm25: BM25Okapi                        │
│  _cache_ready: bool                             │
│  _cache_lock: threading.Lock                     │
│                                                  │
│  _rebuild_cache() ← builds from ChromaDB once    │
│  _get_cached_state() ← lazy init + returns cache │
│  invalidate_bm25_cache() ← public trigger        │
└─────────────────────────────────────────────────┘
         ▲                           ▲
         │ (first query or           │ (after ingestion)
         │  server restart)          │
         │                           │
    retrieve_documents()      ingest.py /ingest endpoint
```

### Key Design Decisions

1. **Lazy initialization**: The cache builds on the first query rather than at import time, avoiding startup failures if ChromaDB isn't ready yet.
2. **Thread-safe locking**: A `threading.Lock` protects the rebuild operation, with double-check locking to avoid redundant rebuilds under concurrency.
3. **Explicit invalidation**: The `/ingest` endpoint calls `invalidate_bm25_cache()` after storing new documents, ensuring the index is always in sync with ChromaDB.
4. **No TTL eviction**: Since the knowledge base only changes on explicit ingestion, time-based expiry is unnecessary and would cause unpredictable rebuilds.

### retrieval_service.py Changes

```python
# Module-level cache variables
_cache_lock = threading.Lock()
_cached_documents: list[Document] | None = None
_cached_bm25: BM25Okapi | None = None
_cache_ready: bool = False


def _rebuild_cache() -> None:
    """Rebuild the in-memory BM25 index from the current ChromaDB collection."""
    global _cached_documents, _cached_bm25, _cache_ready
    collection = get_vectorstore().get()
    # ... build documents and BM25 index ...
    _cache_ready = True


def invalidate_bm25_cache() -> None:
    """Invalidate and rebuild the BM25 cache. Call after ingestion."""
    with _cache_lock:
        _rebuild_cache()


def _get_cached_state() -> tuple[list[Document], BM25Okapi | None, bool]:
    """Return cached documents and BM25 index, building on first access."""
    if not _cache_ready:
        with _cache_lock:
            if not _cache_ready:
                _rebuild_cache()
    return _cached_documents or [], _cached_bm25, _cache_ready
```

### ingest.py Changes

```python
from app.services.retrieval_service import invalidate_bm25_cache

# After storing documents in ChromaDB:
add_documents(chunks)
invalidate_bm25_cache()  # Rebuild BM25 index with fresh data
```

## Files Modified

| File                                           | Change                                                                                              |
| :--------------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| `ai-service/app/services/retrieval_service.py` | Added module-level BM25 cache with lazy init, thread-safe rebuild, and public invalidation function |
| `ai-service/app/routes/ingest.py`              | Imported and called `invalidate_bm25_cache()` after successful document ingestion                   |

## Performance Impact

| Metric                                   | Before                      | After                 |
| :--------------------------------------- | :-------------------------- | :-------------------- |
| ChromaDB full-collection reads per query | 1                           | 0 (cached)            |
| BM25 index builds per query              | 1                           | 0 (cached)            |
| Corpus tokenization per query            | O(N)                        | 0 (cached)            |
| Memory for index                         | Allocated + GC'd each query | Persistent (one copy) |
| Cache rebuild trigger                    | Every query                 | Only on `/ingest`     |

## Verification

- First query triggers a single cache build (one-time cost).
- Subsequent queries reuse the cached BM25 index with zero rebuild overhead.
- After calling `/ingest`, the cache is invalidated and rebuilt with the new corpus.
- Thread safety is ensured via `threading.Lock` with double-check pattern.
