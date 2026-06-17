from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
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
async def chat(request: ChatRequest):
    try:
        if not request.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        response = run_advisor(
            query=request.query,
            session_id=request.sessionId,
            business_context=request.businessContext,
        )
        return ChatResponse(**response)
    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as e:
        print(f"[Chat] Error: {e}")
        raise HTTPException(status_code=500, detail="AI pipeline failed")
