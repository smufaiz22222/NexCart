from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.memory.session_memory import get_structured_history

router = APIRouter()


class HistoryMessage(BaseModel):
    role: str
    text: str


class HistoryResponse(BaseModel):
    sessionId: str
    messages: list[HistoryMessage]


@router.get("/history", response_model=HistoryResponse)
async def history(sessionId: str = Query(..., min_length=1)):
    normalized_session_id = sessionId.strip()
    if not normalized_session_id:
        raise HTTPException(status_code=400, detail="sessionId is required")

    messages = get_structured_history(normalized_session_id)
    return HistoryResponse(sessionId=normalized_session_id, messages=messages)
