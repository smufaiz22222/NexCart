BUSINESS_HINTS = {
    "my business",
    "my store",
    "my sales",
    "my revenue",
    "my inventory",
    "my retention",
    "my repeat customer",
    "low stock",
    "repeat customer",
    "business performing",
    "how am i doing",
    "how is my business",
    "risk",
    "risks",
    "performing",
    "products need attention",
    "prioritize",
    "inventory issues",
}

KNOWLEDGE_HINTS = {
    "what is",
    "explain",
    "define",
    "common strategies",
    "best practices",
    "warehouse operations",
    "inventory turnover",
    "carrying cost",
    "retention strategies",
    "optimize",
    "guide",
    "framework",
}

UNAVAILABLE_CONTEXT_HINTS = {
    "last year",
    "previous year",
    "last quarter",
    "previous quarter",
    "last month",
    "previous month",
    "year over year",
    "historical",
    "history of",
    "trend over time",
}


def classify_question(query: str) -> str:
    normalized_query = (query or "").strip().lower()

    has_business = any(hint in normalized_query for hint in BUSINESS_HINTS)
    has_knowledge = any(hint in normalized_query for hint in KNOWLEDGE_HINTS)

    if ("my " in normalized_query or "our " in normalized_query) and has_knowledge:
        return "hybrid"
    if has_business and has_knowledge:
        return "hybrid"
    if has_business:
        return "business-context"
    if has_knowledge:
        return "knowledge-base"
    if "why" == normalized_query or normalized_query.startswith("why ") or normalized_query.startswith("what should i prioritize"):
        return "business-context"
    return "knowledge-base"


def requests_unavailable_business_data(query: str) -> bool:
    normalized_query = (query or "").strip().lower()
    if any(hint in normalized_query for hint in UNAVAILABLE_CONTEXT_HINTS):
        return True

    asks_exact_financial = (
        ("exact revenue" in normalized_query or "exact sales" in normalized_query)
        and "this month" not in normalized_query
    )
    return asks_exact_financial
