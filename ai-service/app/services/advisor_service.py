import logging
import os

from app.memory.session_memory import add_message, format_history_for_prompt
from app.services.citation_service import build_citations
from app.services.domain_filter import (
    INTENT_CHITCHAT,
    INTENT_GOODBYE,
    INTENT_GREETING,
    INTENT_HELP,
    INTENT_KNOWLEDGE_QUERY,
    INTENT_METRICS_QUERY,
    INTENT_OUT_OF_SCOPE,
    INTENT_THANKS,
    classify_intent,
)
from app.services.llm_provider import get_llm
from app.services.llm_response_parser import extract_text_from_llm_response
from app.services.prompt_builder import (
    BUSINESS_ADVISOR_PROMPT,
    build_business_context_text,
    build_rag_context_text,
    build_rule_insights_text,
)
from app.services.retrieval_service import get_knowledge_base_state, retrieve_documents
from app.services.rule_engine import generate_rule_insights

logger = logging.getLogger(__name__)

EMPTY_KB_MESSAGE = (
    "The business advisor knowledge base has not been initialized yet. "
    "Please ingest advisor documents before using the assistant."
)
CLARIFICATION_MESSAGE = "I don't have enough information on that yet — could you clarify or add more detail?"
OUT_OF_SCOPE_MESSAGE = (
    "I'm here to help with your business — inventory, sales, suppliers, and orders. "
    "Could you ask something related to that?"
)
METRICS_UNAVAILABLE_MESSAGE = "I couldn't retrieve that metric right now — please try again or check if the data is available."

MIN_SIMILARITY_SCORE = float(os.getenv("MIN_SIMILARITY_SCORE", "0.75"))
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

    # 1. Intent Classification (Gemini-first with exact-match allowlist)
    intent, intent_source = classify_intent(normalized_query)
    logger.info(
        "Session: %s | Query: '%s' | Intent: %s (Source: %s)",
        normalized_session_id,
        normalized_query,
        intent,
        intent_source,
    )

    # 2. Branching Pipeline
    if intent == INTENT_GREETING:
        answer = (
            "Hello! I'm your NexCart AI Business Advisor. "
            "How can I help you manage your store, analyze sales, or answer business questions today?"
        )
        return _finalize_response(normalized_session_id, normalized_query, answer, [])

    if intent == INTENT_THANKS:
        answer = "You're very welcome! Let me know if you need anything else for your business."
        return _finalize_response(normalized_session_id, normalized_query, answer, [])

    if intent == INTENT_GOODBYE:
        answer = "Goodbye! Wishing you great success with your business."
        return _finalize_response(normalized_session_id, normalized_query, answer, [])

    if intent == INTENT_HELP:
        answer = (
            "I'm your NexCart AI Business Advisor. I can help you in two main ways:\n\n"
            "1. **Live Business Metrics**: Get real-time updates on store performance, sales, inventory levels, and customer retention.\n"
            "   - *Examples*: 'What are my total sales this month?', 'What is my repeat customer rate?', 'Which products are low on stock?'\n\n"
            "2. **Business Knowledge & Strategy**: Get advice on wholesale operations, return policies, marketing strategies, and inventory management.\n"
            "   - *Examples*: 'What is our return policy for wholesale orders?', 'How can I improve inventory turnover?', 'What are best practices for customer retention?'\n\n"
            "How can I assist you today?"
        )
        return _finalize_response(normalized_session_id, normalized_query, answer, [])

    if intent == INTENT_CHITCHAT:
        answer = (
            "I'm doing well, thank you! I'm focused on helping you scale your business on NexCart. "
            "What metrics or business questions would you like to explore today?"
        )
        return _finalize_response(normalized_session_id, normalized_query, answer, [])

    if intent == INTENT_OUT_OF_SCOPE:
        return _finalize_response(
            normalized_session_id, normalized_query, OUT_OF_SCOPE_MESSAGE, []
        )

    if intent == INTENT_METRICS_QUERY:
        # Check DB/API layer live business context
        metrics_available = bool(
            business_context and any(v is not None for v in business_context.values())
        )
        called_metrics = list(business_context.keys()) if business_context else []
        null_metrics = (
            [k for k, v in business_context.items() if v is None]
            if business_context
            else []
        )

        if null_metrics:
            logger.warning(
                "Partial business_context detected for METRICS_QUERY. Missing/Null fields: %s",
                null_metrics,
            )

        logger.info(
            "Intent: METRICS_QUERY | Metrics Endpoint/Context Keys: %s | Available: %s",
            called_metrics,
            metrics_available,
        )

        if not metrics_available:
            return _finalize_response(
                normalized_session_id,
                normalized_query,
                METRICS_UNAVAILABLE_MESSAGE,
                [],
            )

        rule_insights = generate_rule_insights(business_context)
        answer = _build_answer(
            query=normalized_query,
            session_id=normalized_session_id,
            business_context=business_context,
            rule_insights=rule_insights,
            question_type="business-context",
            retrieved_documents=[],
        )
        return _finalize_response(normalized_session_id, normalized_query, answer, [])

    if intent == INTENT_KNOWLEDGE_QUERY:
        retrieved_documents = []
        best_score = 0.0

        kb_state = get_knowledge_base_state()
        if kb_state.get("ready"):
            retrieval_result = retrieve_documents(
                normalized_query, min_score=MIN_SIMILARITY_SCORE
            )
            best_score = retrieval_result.best_semantic_score
            if retrieval_result.confident:
                retrieved_documents = retrieval_result.documents

        logger.info(
            "Intent: KNOWLEDGE_QUERY | Best Score: %.4f | Threshold: %.2f | Docs Used: %d",
            best_score,
            MIN_SIMILARITY_SCORE,
            len(retrieved_documents),
        )

        rule_insights = generate_rule_insights(business_context)
        answer = _build_answer(
            query=normalized_query,
            session_id=normalized_session_id,
            business_context=business_context,
            rule_insights=rule_insights,
            question_type="knowledge-base",
            retrieved_documents=retrieved_documents,
        )
        return _finalize_response(
            normalized_session_id,
            normalized_query,
            answer,
            retrieved_documents,
        )

    # Defensive fallback — should be unreachable since classify_intent only returns valid intents
    return _finalize_response(
        normalized_session_id, normalized_query, CLARIFICATION_MESSAGE, []
    )
