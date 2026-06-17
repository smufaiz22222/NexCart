import os
from dataclasses import dataclass

from langchain_core.documents import Document
from rank_bm25 import BM25Okapi

from app.services.document_utils import normalize_chunk_metadata
from app.vectorstore.chroma_store import get_vectorstore

MIN_RETRIEVAL_SCORE = float(os.getenv("MIN_RETRIEVAL_SCORE", "0.55"))
RETRIEVAL_TOP_K = int(os.getenv("RETRIEVAL_TOP_K", "5"))


@dataclass
class RetrievalResult:
    confident: bool
    knowledge_base_ready: bool
    documents: list[Document]
    best_semantic_score: float


def _doc_key(document: Document) -> str:
    metadata = document.metadata or {}
    return f"{metadata.get('source', 'unknown')}::{metadata.get('page', '?')}::{document.page_content}"


def _build_documents_from_collection(collection: dict) -> list[Document]:
    documents = collection.get("documents") or []
    metadatas = collection.get("metadatas") or []
    result: list[Document] = []

    for content, metadata in zip(documents, metadatas):
        result.append(
            Document(page_content=content, metadata=normalize_chunk_metadata(metadata))
        )
    return result


def get_knowledge_base_state() -> dict:
    collection = get_vectorstore().get()
    documents = collection.get("documents") or []
    return {
        "ready": len(documents) > 0,
        "count": len(documents),
        "documents": _build_documents_from_collection(collection),
    }


def _get_vector_results(query: str, top_k: int) -> list[tuple[Document, float]]:
    vectorstore = get_vectorstore()
    try:
        results = vectorstore.similarity_search_with_relevance_scores(query, k=top_k)
        normalized_results: list[tuple[Document, float]] = []
        for document, score in results:
            document.metadata = normalize_chunk_metadata(document.metadata)
            normalized_results.append((document, float(score)))
        return normalized_results
    except Exception:
        results = vectorstore.similarity_search_with_score(query, k=top_k)
        normalized_results = []
        for document, distance in results:
            document.metadata = normalize_chunk_metadata(document.metadata)
            score = 1 / (1 + float(distance))
            normalized_results.append((document, score))
        return normalized_results


def retrieve_documents(
    query: str, top_k: int | None = None, min_score: float | None = None
) -> RetrievalResult:
    retrieval_top_k = top_k or RETRIEVAL_TOP_K
    min_retrieval_score = min_score if min_score is not None else MIN_RETRIEVAL_SCORE

    knowledge_base = get_knowledge_base_state()
    if not knowledge_base["ready"]:
        return RetrievalResult(
            confident=False,
            knowledge_base_ready=False,
            documents=[],
            best_semantic_score=0.0,
        )

    all_documents = knowledge_base["documents"]
    vector_results = _get_vector_results(query, max(retrieval_top_k, 5))
    best_semantic_score = max((score for _, score in vector_results), default=0.0)

    tokenized_corpus = [
        document.page_content.lower().split() for document in all_documents
    ]
    bm25 = BM25Okapi(tokenized_corpus)
    bm25_scores = bm25.get_scores(query.lower().split())
    max_bm25_score = max(bm25_scores) if len(bm25_scores) else 0.0

    combined: dict[str, dict] = {}

    for document, semantic_score in vector_results:
        key = _doc_key(document)
        combined[key] = {
            "document": document,
            "semantic_score": float(semantic_score),
            "keyword_score": 0.0,
        }

    for index, document in enumerate(all_documents):
        keyword_score = 0.0
        if max_bm25_score > 0:
            keyword_score = float(bm25_scores[index]) / float(max_bm25_score)
        key = _doc_key(document)
        if key not in combined:
            combined[key] = {
                "document": document,
                "semantic_score": 0.0,
                "keyword_score": keyword_score,
            }
        else:
            combined[key]["keyword_score"] = keyword_score

    ranked_documents = sorted(
        combined.values(),
        key=lambda item: (item["semantic_score"] * 0.7) + (item["keyword_score"] * 0.3),
        reverse=True,
    )

    confident = best_semantic_score >= min_retrieval_score
    selected_documents: list[Document] = []
    for item in ranked_documents:
        if len(selected_documents) >= retrieval_top_k:
            break
        if confident and item["semantic_score"] == 0 and item["keyword_score"] == 0:
            continue
        selected_documents.append(item["document"])

    return RetrievalResult(
        confident=confident,
        knowledge_base_ready=True,
        documents=selected_documents,
        best_semantic_score=best_semantic_score,
    )
