from app.services.advisor_service import run_advisor


def run_rag_pipeline(query: str, session_id: str, business_context: dict) -> dict:
    return run_advisor(
        query=query, session_id=session_id, business_context=business_context
    )
