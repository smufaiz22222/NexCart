from collections import defaultdict

# Persistable in-memory store for session conversations!!!!!!!
_memory_store: dict[str, list] = defaultdict(list)
MAX_HISTORY = 10


def add_message(session_id: str, role: str, content: str):
    _memory_store[session_id].append({"role": role, "content": content})
    if len(_memory_store[session_id]) > MAX_HISTORY:
        _memory_store[session_id] = _memory_store[session_id][-MAX_HISTORY:]


def get_history(session_id: str) -> list:
    return _memory_store[session_id]


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
    if session_id in _memory_store:
        del _memory_store[session_id]
