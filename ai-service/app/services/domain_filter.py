import logging
import re
from app.services.llm_provider import get_llm
from langchain_core.prompts import PromptTemplate

logger = logging.getLogger(__name__)

# Supported Intent Constants
INTENT_GREETING = "GREETING"
INTENT_THANKS = "THANKS"
INTENT_GOODBYE = "GOODBYE"
INTENT_HELP = "HELP"
INTENT_CHITCHAT = "CHITCHAT"
INTENT_METRICS_QUERY = "METRICS_QUERY"
INTENT_KNOWLEDGE_QUERY = "KNOWLEDGE_QUERY"
INTENT_OUT_OF_SCOPE = "OUT_OF_SCOPE"

VALID_INTENTS = {
    INTENT_GREETING,
    INTENT_THANKS,
    INTENT_GOODBYE,
    INTENT_HELP,
    INTENT_CHITCHAT,
    INTENT_METRICS_QUERY,
    INTENT_KNOWLEDGE_QUERY,
    INTENT_OUT_OF_SCOPE,
}

# Exact-match allowlist (near-zero cost, only for truly trivial cases)
EXACT_MATCH_ALLOWLIST = {
    "hi": INTENT_GREETING,
    "hello": INTENT_GREETING,
    "hey": INTENT_GREETING,
    "good morning": INTENT_GREETING,
    "good afternoon": INTENT_GREETING,
    "good evening": INTENT_GREETING,
    "thanks": INTENT_THANKS,
    "thank you": INTENT_THANKS,
    "thx": INTENT_THANKS,
    "many thanks": INTENT_THANKS,
    "bye": INTENT_GOODBYE,
    "goodbye": INTENT_GOODBYE,
    "cya": INTENT_GOODBYE,
    "see ya": INTENT_GOODBYE,
    "help": INTENT_HELP,
}

INTENT_CLASSIFIER_PROMPT = PromptTemplate.from_template("""
You are an intent classifier for NexCart's AI Business Advisor microservice.
Classify the seller's user query into EXACTLY ONE of the following valid intent categories:

- GREETING: Hello, hi, or casual greetings.
- THANKS: Expressions of gratitude or thanks.
- GOODBYE: Farewell phrases.
- HELP: Requests explaining what the assistant can do or asking for available features/capabilities.
- CHITCHAT: Casual conversational remarks directed at the assistant (e.g. "how are you", "how's your day going").
- METRICS_QUERY: Questions asking for live computed business metrics, sales data, performance numbers, inventory counts, repeat customer rates, inventory turnover, or account statistics requiring DB/API data.
- KNOWLEDGE_QUERY: Questions asking for documentation, policies, operational advice, product information, or business guidance stored in documents and knowledge base (not backed by live computed metrics).
- OUT_OF_SCOPE: Questions completely unrelated to e-commerce, wholesale, business management, or the assistant (e.g. "what's the weather in Paris", sports, trivia).

CONTRASTIVE EXAMPLES:
1. CHITCHAT vs OUT_OF_SCOPE:
   - "how's your day going" -> CHITCHAT (directed at the assistant)
   - "what's the weather in Paris" -> OUT_OF_SCOPE (unrelated to NexCart or business)

2. METRICS_QUERY vs KNOWLEDGE_QUERY:
   - "what's my inventory turnover this quarter" -> METRICS_QUERY (needs computed live value from DB/API)
   - "what's our return policy for wholesale orders" -> KNOWLEDGE_QUERY (needs document lookup)

User Query: {query}

Reply with ONLY the exact intent label from the list above (e.g., METRICS_QUERY). Do NOT include any punctuation, quotes, or extra text.
""")


def _normalize_exact_match(query: str) -> str:
    """Lowercase and strip punctuation/whitespace for exact match checking."""
    return re.sub(r"[^\w\s]", "", query.lower()).strip()


def classify_intent(query: str) -> tuple[str, str]:
    """
    Classifies the user query intent.
    Returns a tuple of (intent_label, classification_source).

    1. Exact-match allowlist check (only exact matches count).
    2. Gemini LLM classification for everything else.
    Defensive parsing: handles str or list LLM outputs, strips whitespace/quotes,
    converts to uppercase, validates against known label set.
    Defaults to KNOWLEDGE_QUERY if Gemini call fails, times out, or returns unrecognized result.
    """
    normalized = _normalize_exact_match(query)

    # 1. Exact-match check
    if normalized in EXACT_MATCH_ALLOWLIST:
        intent = EXACT_MATCH_ALLOWLIST[normalized]
        logger.info("Exact-match hit: '%s' -> %s", query, intent)
        return intent, "exact_match"

    # 2. Gemini classification
    try:
        llm = get_llm()
        chain = INTENT_CLASSIFIER_PROMPT | llm

        result = chain.invoke({"query": query})

        # Extract text safely whether result.content is a str, list, or object
        if hasattr(result, "content"):
            content = result.content
            if isinstance(content, list):
                raw_answer = " ".join(
                    item
                    if isinstance(item, str)
                    else (
                        item.get("text", str(item))
                        if isinstance(item, dict)
                        else str(item)
                    )
                    for item in content
                )
            else:
                raw_answer = str(content)
        else:
            raw_answer = str(result)

        # Defensive parsing
        cleaned_answer = raw_answer.strip().strip("'\"`").upper()

        if cleaned_answer in VALID_INTENTS:
            logger.info("Gemini classification: '%s' -> %s", query, cleaned_answer)
            return cleaned_answer, "gemini"
        else:
            logger.warning(
                "Unrecognized Gemini response '%s', defaulting to %s",
                raw_answer,
                INTENT_KNOWLEDGE_QUERY,
            )
            return INTENT_KNOWLEDGE_QUERY, "gemini_fallback"

    except Exception as e:
        logger.warning(
            "Gemini classification failed (%s), defaulting to %s",
            e,
            INTENT_KNOWLEDGE_QUERY,
        )
        return INTENT_KNOWLEDGE_QUERY, "gemini_fallback"
