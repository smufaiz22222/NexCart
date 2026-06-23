from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.dependencies.auth import AuthenticatedUser, require_advisor_user
from app.services.session_scope import build_scoped_session_id
from app.services.advisor_service import run_advisor

router = APIRouter()


class ChatRequest(BaseModel):
    query: str
    sessionId: str
    businessContext: dict = {}


class ChatSource(BaseModel):
    file: str
    page: int


class ChatResponse(BaseModel):
    answer: str
    sources: list[ChatSource]
    sessionId: str


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: Annotated[AuthenticatedUser, Depends(require_advisor_user)],
):
    try:
        if not request.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        scoped_session_id = build_scoped_session_id(current_user, request.sessionId)
        response = run_advisor(
            query=request.query,
            session_id=scoped_session_id,
            business_context=request.businessContext,
        )
        return ChatResponse(
            answer=response["answer"],
            sources=response["sources"],
            sessionId=request.sessionId.strip(),
        )
    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as e:
        print(f"[Chat] Error: {e}")
        raise HTTPException(status_code=500, detail="AI pipeline failed")
