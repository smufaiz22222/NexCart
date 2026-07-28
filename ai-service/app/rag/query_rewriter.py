from langchain_core.prompts import PromptTemplate
from app.services.llm_provider import get_llm

REWRITE_PROMPT = PromptTemplate.from_template("""
You are an expert e-commerce business consultant.
Rewrite the following user query into a detailed, specific search query
that will retrieve the most relevant business advice from a knowledge base.

Rules:
- Keep it focused on e-commerce, wholesale, or retail business
- Make it specific and actionable
- Output ONLY the rewritten query, nothing else

Original query: {query}

Rewritten query:
""")


def rewrite_query(query: str) -> str:
    try:
        llm = get_llm()
        chain = REWRITE_PROMPT | llm
        result = chain.invoke({"query": query})
        rewritten = result.content if hasattr(result, "content") else str(result)
        rewritten = rewritten.strip()
        print(f"[QueryRewriter] '{query}' → '{rewritten}'")
        return rewritten if rewritten else query
    except Exception as e:
        print(f"[QueryRewriter] Failed, using original. Error: {e}")
        return query
