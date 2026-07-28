from app.dependencies.auth import AuthenticatedUser


def build_scoped_session_id(user: AuthenticatedUser, session_id: str) -> str:
    normalized_session_id = (session_id or "").strip()
    if not normalized_session_id:
        normalized_session_id = "default-session"

    return f"{user.user_id}:{normalized_session_id}"
