# domain_filter.py — FIXED
# Old approach: keyword list matching — fragile, misses valid queries
# New approach: small LLM call classifies intent — much smarter
#
# Example queries that keyword matching MISSED but LLM catches:
#   "How do I get more buyers?"       → YES (buyers = customers)
#   "My store isn't doing well"       → YES (store = e-commerce)
#   "What should I charge?"           → YES (charge = pricing)
#   "Tell me a joke"                  → NO
#   "Write me a poem"                 → NO

from app.services.llm_provider import get_llm
from langchain_core.prompts import PromptTemplate

REJECTION_MESSAGE = (
    "I'm NexCart's AI Business Advisor and I can only help with topics related to "
    "e-commerce, wholesale, pricing, inventory, marketing, sales, and business growth. "
    "Please ask me a business-related question and I'll be happy to help!"
)

CLASSIFIER_PROMPT = PromptTemplate.from_template("""
Is the following query related to any of these topics:
e-commerce, online selling, wholesale, retail, pricing, inventory management, 
sales, marketing, customer retention, business growth, or entrepreneurship?

Query: {query}

Reply with ONLY one word: YES or NO
""")

def classify_business_query(query: str) -> bool:
    """
    Uses the LLM to classify whether the query is business-related.
    Returns True if business-related, False otherwise.
    Falls back to True on LLM failure (fail open — better UX than false rejection).
    """
    try:
        llm = get_llm()
        chain = CLASSIFIER_PROMPT | llm

        result = chain.invoke({"query": query})
        answer = result.content if hasattr(result, "content") else str(result)
        answer = answer.strip().upper()

        print(f"[DomainFilter] Query: '{query}' → Classification: {answer}")

        # Accept YES or any response starting with YES
        return answer.startswith("YES")

    except Exception as e:
        print(f"[DomainFilter] LLM classification failed, failing open. Error: {e}")
        # Fail open — if classifier breaks, don't block the user
        return True