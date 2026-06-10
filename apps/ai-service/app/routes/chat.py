from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.rag.pipeline import run_rag_pipeline

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    sessionId: str
    businessContext: dict = {}

class ChatResponse(BaseModel):
    response: str
    sessionId: str

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        if not request.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        response = run_rag_pipeline(
            query=request.query,
            session_id=request.sessionId,
            business_context=request.businessContext,
        )
        return ChatResponse(response=response, sessionId=request.sessionId)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Chat] Error: {e}")
        raise HTTPException(status_code=500, detail="AI pipeline failed")