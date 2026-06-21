from langchain_core.prompts import PromptTemplate
from app.services.llm_provider import get_llm

MULTI_QUERY_PROMPT = PromptTemplate.from_template("""
You are an e-commerce business advisor.
Generate 4 different search query variations for the following business question.
Each should approach the topic from a slightly different angle.

Rules:
- All variations must stay within business, e-commerce, or wholesale topics
- One variation per line
- Output ONLY the 4 queries, no numbering, no explanations

Original query: {query}

4 variations:
""")


def generate_multi_queries(query: str) -> list[str]:
    try:
        llm = get_llm()
        chain = MULTI_QUERY_PROMPT | llm
        result = chain.invoke({"query": query})
        raw = result.content if hasattr(result, "content") else str(result)
        variations = [line.strip() for line in raw.strip().split("\n") if line.strip()]
        all_queries = [query] + variations[:4]
        print(f"[MultiQuery] Generated {len(all_queries)} variants")
        return all_queries
    except Exception as e:
        print(f"[MultiQuery] Failed, using original. Error: {e}")
        return [query]
