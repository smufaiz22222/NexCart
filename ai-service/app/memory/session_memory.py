import time

MAX_HISTORY = 10


class TTLCache:
    def __init__(self, ttl_seconds: int = 3600, max_size: int = 1000):
        self.ttl_seconds = ttl_seconds
        self.max_size = max_size
        self._store = {}  # session_id -> (history_list, last_accessed_time)

    def _prune(self):
        now = time.time()
        # Delete expired sessions
        expired = [
            sid
            for sid, (_, last_accessed) in self._store.items()
            if now - last_accessed > self.ttl_seconds
        ]
        for sid in expired:
            del self._store[sid]

        # If size still exceeds max_size, evict the least recently accessed session
        if len(self._store) > self.max_size:
            # Sort by last accessed time ascending
            sorted_sessions = sorted(self._store.items(), key=lambda item: item[1][1])
            to_evict_count = len(self._store) - self.max_size
            for i in range(to_evict_count):
                del self._store[sorted_sessions[i][0]]

    def get(self, session_id: str) -> list:
        self._prune()
        if session_id in self._store:
            history, _ = self._store[session_id]
            # Update last accessed time
            self._store[session_id] = (history, time.time())
            return list(history)
        return []

    def set(self, session_id: str, history: list):
        self._prune()
        self._store[session_id] = (list(history), time.time())

    def clear(self, session_id: str):
        if session_id in self._store:
            del self._store[session_id]


# In-memory store with 1-hour TTL and maximum 1000 sessions
_cache = TTLCache(ttl_seconds=3600, max_size=1000)


def add_message(session_id: str, role: str, content: str):
    history = _cache.get(session_id)
    history.append({"role": role, "content": content})
    if len(history) > MAX_HISTORY:
        history = history[-MAX_HISTORY:]
    _cache.set(session_id, history)


def get_history(session_id: str) -> list:
    return _cache.get(session_id)


def get_structured_history(session_id: str) -> list[dict]:
    history = get_history(session_id)
    return [
        {
            "role": message.get("role", "assistant"),
            "text": message.get("content", ""),
        }
        for message in history
    ]


def format_history_for_prompt(session_id: str) -> str:
    history = get_history(session_id)
    if not history:
        return "No previous conversation."
    lines = []
    for msg in history:
        prefix = "Seller" if msg["role"] == "user" else "Advisor"
        lines.append(f"{prefix}: {msg['content']}")
    return "\n".join(lines)


def clear_session(session_id: str):
    _cache.clear(session_id)
