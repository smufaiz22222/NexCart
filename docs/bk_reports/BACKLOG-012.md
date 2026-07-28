# BACKLOG-012: Unbounded In-Memory Cache Memory Leak in FastAPI Memory Store

## Issue Description

The FastAPI Python service stored chat histories in a local global dictionary (`_memory_store`) which grew unboundedly as new sessions were initialized. This created a potential memory leak and risk of memory exhaustion (OOM) crashes in production.

---

## Resolution

We optimized chat session storage inside `session_memory.py` (`ai-service/app/memory/session_memory.py`):

1. **Lightweight TTLCache**: Implemented a dependency-free custom `TTLCache` class using Python's standard `time` module.
2. **TTL Expiring**: Configured a default TTL threshold of 1 hour (3600 seconds), automatically removing inactive conversations from the cache on get/set checks.
3. **Max Size Enforcing**: Configured a default size bound of 1000 sessions, evicting the least recently accessed sessions if the capacity limit is exceeded.
4. **Preserved API**: Maintained identical function interfaces (`add_message`, `get_history`, `clear_session`) so that other services using the memory utility required no changes.

---

## Files Changed

### 1. [session_memory.py](file:///c:/Users/smufa/Desktop/NexCart_updated/ai-service/app/memory/session_memory.py)

- Replaced the global `defaultdict` with the `TTLCache` instance and updated history logic to use it.

---

## Verification

- Verified file formatting and syntax correctness using Ruff (`ruff check` and `ruff format`).
- Verified backend unit and integration tests run and pass perfectly.
