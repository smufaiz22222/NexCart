import json
import os

from langchain_core.prompts import PromptTemplate


BUSINESS_ADVISOR_PROMPT = PromptTemplate.from_template(
    """
You are NexCart AI Business Advisor.

Your responsibilities:
- Analyze business metrics.
- Analyze inventory health.
- Analyze sales performance.
- Identify risks.
- Identify growth opportunities.
- Recommend inventory actions.
- Recommend sales actions.
- Use retrieved documents as supporting knowledge.
- Prioritize provided businessContext over assumptions.
- Never invent business metrics.
- Never fabricate financial data.
- Never invent trends or document content.
- If information is unavailable, explicitly say: "I don't have enough information to determine that."

PRIORITY ORDER:
1. Explicit business metrics
2. Deterministic advisor insights
3. Conversation history
4. Retrieved documents
5. General reasoning

BUSINESS CONTEXT:
{business_context}

RULE-BASED INSIGHTS:
{rule_insights}

CONVERSATION HISTORY:
{chat_history}

QUESTION TYPE:
{question_type}

KNOWLEDGE BASE CONTEXT:
{rag_context}

SELLER QUESTION:
{query}

ANSWERING RULES:
- If the answer can be given from the business context alone, do that directly.
- If retrieved documents are provided, use them as support and reference them naturally.
- If retrieved documents are not provided, do not pretend they exist.
- Never let generic advice override real business metrics.
- End with one concrete next action the seller can take today.

FINAL ANSWER:
""".strip()
)


def build_business_context_text(business_context: dict) -> str:
    ctx = business_context or {}
    if not ctx:
        return "No business metrics were provided for this session."

    lines = [
        f"- monthlySales: {ctx.get('monthlySales', 0)}",
        f"- lowStockProducts: {ctx.get('lowStockProducts', 0)}",
        f"- unsoldInventory: {ctx.get('unsoldInventory', 0)}",
        f"- topSellingCategory: {ctx.get('topSellingCategory', 'N/A')}",
        f"- repeatCustomerRate: {ctx.get('repeatCustomerRate', 0)}",
        f"- totalProducts: {ctx.get('totalProducts', 0)}",
    ]

    generated_at = ctx.get("generatedAt")
    if generated_at:
        lines.append(f"- generatedAt: {generated_at}")

    lines.append("")
    lines.append("Raw businessContext payload:")
    lines.append(json.dumps(ctx, indent=2, default=str))
    return "\n".join(lines)


def build_rule_insights_text(insights: list[str]) -> str:
    if not insights:
        return "- No deterministic business insights were generated."
    return "\n".join(f"- {insight}" for insight in insights)


def build_rag_context_text(documents: list) -> str:
    if not documents:
        return "No reliable knowledge base documents were used for this answer."

    chunks: list[str] = []
    for document in documents:
        source = os.path.basename(document.metadata.get("source", "unknown.pdf"))
        page = document.metadata.get("page", "?")
        chunks.append(f"[Source: {source}, Page {page}]\n{document.page_content}")
    return "\n\n---\n\n".join(chunks)
