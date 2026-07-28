from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.dependencies.auth import AuthenticatedUser, require_advisor_user
from app.memory.session_memory import get_structured_history
from app.services.session_scope import build_scoped_session_id

router = APIRouter()


class HistoryMessage(BaseModel):
    role: str
    text: str


class HistoryResponse(BaseModel):
    sessionId: str
    messages: list[HistoryMessage]


@router.get("/history", response_model=HistoryResponse)
async def history(
    sessionId: Annotated[str, Query(min_length=1)],
    current_user: Annotated[AuthenticatedUser, Depends(require_advisor_user)],
):
    normalized_session_id = sessionId.strip()
    if not normalized_session_id:
        raise HTTPException(status_code=400, detail="sessionId is required")

    scoped_session_id = build_scoped_session_id(current_user, normalized_session_id)
    messages = get_structured_history(scoped_session_id)
    return HistoryResponse(sessionId=normalized_session_id, messages=messages)
