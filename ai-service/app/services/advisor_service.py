import os

from app.memory.session_memory import add_message, format_history_for_prompt
from app.services.citation_service import build_citations
from app.services.llm_provider import get_llm
from app.services.llm_response_parser import extract_text_from_llm_response
from app.services.prompt_builder import (
    BUSINESS_ADVISOR_PROMPT,
    build_business_context_text,
    build_rag_context_text,
    build_rule_insights_text,
)
from app.services.question_classifier import (
    classify_question,
    requests_unavailable_business_data,
)
from app.services.retrieval_service import retrieve_documents
from app.services.rule_engine import generate_rule_insights

EMPTY_KB_MESSAGE = (
    "The business advisor knowledge base has not been initialized yet. "
    "Please ingest advisor documents before using the assistant."
)
LOW_CONFIDENCE_MESSAGE = "I do not have enough information in the knowledge base to answer that question confidently."
UNAVAILABLE_DATA_MESSAGE = "I don't have enough information to determine that."
MAX_CITATIONS = int(os.getenv("MAX_CITATIONS", "5"))


def _normalize_session_id(session_id: str) -> str:
    normalized = (session_id or "").strip()
    return normalized or "anonymous-session"


def _build_answer(
    query: str,
    session_id: str,
    business_context: dict,
    rule_insights: list[str],
    question_type: str,
    retrieved_documents: list,
) -> str:
    llm = get_llm()
    chain = BUSINESS_ADVISOR_PROMPT | llm
    response = chain.invoke(
        {
            "business_context": build_business_context_text(business_context),
            "rule_insights": build_rule_insights_text(rule_insights),
            "chat_history": format_history_for_prompt(session_id),
            "question_type": question_type,
            "rag_context": build_rag_context_text(retrieved_documents),
            "query": query,
        }
    )
    return extract_text_from_llm_response(response)


def _finalize_response(
    session_id: str, query: str, answer: str, documents: list
) -> dict:
    add_message(session_id, "user", query)
    add_message(session_id, "assistant", answer)
    return {
        "answer": answer,
        "sources": build_citations(documents, MAX_CITATIONS),
        "sessionId": session_id,
    }


def run_advisor(
    query: str, session_id: str, business_context: dict | None = None
) -> dict:
    normalized_query = (query or "").strip()
    if not normalized_query:
        raise ValueError("Query cannot be empty")

    normalized_session_id = _normalize_session_id(session_id)
    business_context = business_context or {}
    rule_insights = generate_rule_insights(business_context)
    question_type = classify_question(normalized_query)

    if requests_unavailable_business_data(normalized_query):
        return _finalize_response(
            normalized_session_id,
            normalized_query,
            UNAVAILABLE_DATA_MESSAGE,
            [],
        )

    retrieved_documents = []
    if question_type in {"knowledge-base", "hybrid"}:
        retrieval_result = retrieve_documents(normalized_query)
        if not retrieval_result.knowledge_base_ready:
            if question_type == "knowledge-base":
                return _finalize_response(
                    normalized_session_id,
                    normalized_query,
                    EMPTY_KB_MESSAGE,
                    [],
                )
            question_type = "business-context"
        else:
            if question_type == "knowledge-base" and not retrieval_result.confident:
                return _finalize_response(
                    normalized_session_id,
                    normalized_query,
                    LOW_CONFIDENCE_MESSAGE,
                    [],
                )
            if retrieval_result.confident:
                retrieved_documents = retrieval_result.documents

    answer = _build_answer(
        query=normalized_query,
        session_id=normalized_session_id,
        business_context=business_context,
        rule_insights=rule_insights,
        question_type=question_type,
        retrieved_documents=retrieved_documents,
    )
    return _finalize_response(
        normalized_session_id, normalized_query, answer, retrieved_documents
    )
