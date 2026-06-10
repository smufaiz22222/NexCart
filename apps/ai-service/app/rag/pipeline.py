# pipeline.py — FIXED
# Key fix: hybrid_retriever.invoke() replaces vectorstore.similarity_search()
# Now BM25 + vector search are both actually used.

from app.services.domain_filter import classify_business_query, REJECTION_MESSAGE
from app.rag.query_rewriter import rewrite_query
from app.rag.multi_query import generate_multi_queries
from app.rag.retriever import build_hybrid_retriever
from app.vectorstore.chroma_store import get_vectorstore
from app.services.context_builder import build_context_paragraph
from app.memory.session_memory import add_message, format_history_for_prompt
from app.prompts.templates import BUSINESS_ADVISOR_PROMPT
from app.services.llm_provider import get_llm

def run_rag_pipeline(
    query: str,
    session_id: str,
    business_context: dict,
) -> str:

    # ── Step 1: Domain filter (LLM-based now) ─────────────────────────────
    if not classify_business_query(query):
        return REJECTION_MESSAGE

    # ── Step 2: Rewrite query ──────────────────────────────────────────────
    rewritten_query = rewrite_query(query)

    # ── Step 3: Generate multi-query variants ──────────────────────────────
    query_variants = generate_multi_queries(rewritten_query)

    # ── Step 4: Load all docs from ChromaDB for BM25 ──────────────────────
    # BM25 needs the full document list to build its index.
    # We fetch everything stored in ChromaDB for this purpose.
    vectorstore = get_vectorstore()
    all_docs_raw = vectorstore.get()  # returns raw ChromaDB dict

    # Convert raw ChromaDB output into LangChain Document objects
    from langchain_core.documents import Document
    all_docs = [ Document( page_content=content, metadata=meta) for content, meta in zip( all_docs_raw["documents"],all_docs_raw["metadatas"])]

    if not all_docs:
        return (
            "My knowledge base is currently empty. "
            "Please ask your administrator to ingest business documents first."
        )

    # ── Step 5: Build hybrid retriever (vector + BM25) ────────────────────
    # THIS is the fix — we now actually use the EnsembleRetriever
    hybrid_retriever = build_hybrid_retriever(all_docs, k=5)

    # ── Step 6: Retrieve across all query variants ─────────────────────────
    seen_contents = set()
    all_chunks = []

    for variant in query_variants:
        # .invoke() uses BOTH vector search AND BM25 — not just vector
        results = hybrid_retriever.invoke(variant)
        for doc in results:
            if doc.page_content not in seen_contents:
                seen_contents.add(doc.page_content)
                all_chunks.append(doc)

    # ── Step 7: Format retrieved chunks WITH source citations ──────────────
    # Fix 4 applied here — each chunk includes its source filename + page
    if all_chunks:
        chunk_texts = []
        for doc in all_chunks[:8]:
            source = doc.metadata.get("source", "Unknown document")
            page   = doc.metadata.get("page", "?")
            # Clean up full path — just keep the filename
            source_name = source.split("/")[-1].replace(".pdf", "")
            chunk_texts.append(
                f"[Source: {source_name}, Page {page}]\n{doc.page_content}"
            )
        rag_context = "\n\n---\n\n".join(chunk_texts)
    else:
        rag_context = "No relevant documents found in the knowledge base."

    # ── Step 8: Build business context paragraph ───────────────────────────
    business_paragraph = build_context_paragraph(business_context)

    # ── Step 9: Get conversation history ──────────────────────────────────
    chat_history = format_history_for_prompt(session_id)

    # ── Step 10: Call LLM ─────────────────────────────────────────────────
    llm = get_llm()
    chain = BUSINESS_ADVISOR_PROMPT | llm

    response = chain.invoke({
        "business_context": business_paragraph,
        "rag_context": rag_context,
        "chat_history": chat_history,
        "query": query,
    })

    answer = response.content if hasattr(response, "content") else str(response)
    answer = answer.strip()

    # ── Step 11: Save to memory ────────────────────────────────────────────
    add_message(session_id, "user", query)
    add_message(session_id, "assistant", answer)

    return answer