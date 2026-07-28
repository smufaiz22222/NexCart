# retriever.py
# Hybrid retriever = semantic vector search (ChromaDB) + keyword search (BM25).
# Combining both gives better results than either alone:
#   - Vector search finds semantically similar content even with different words
#   - BM25 finds exact keyword matches that vector search might miss

from langchain_community.retrievers import BM25Retriever
from langchain_classic.retrievers import EnsembleRetriever
from langchain_core.documents import Document
from app.vectorstore.chroma_store import get_vectorstore


def build_hybrid_retriever(all_docs: list[Document], k: int = 6) -> EnsembleRetriever:
    """
    Builds a hybrid retriever combining:
    - ChromaDB vector retriever (semantic similarity)
    - BM25 retriever (keyword matching)

    all_docs: the full list of document chunks in the knowledge base
    k: number of results each retriever fetches (final results are merged)
    """

    # Semantic retriever — finds contextually similar content
    vector_retriever = get_vectorstore().as_retriever(
        search_type="similarity",
        search_kwargs={"k": k},
    )

    # BM25 keyword retriever — finds exact term matches
    bm25_retriever = BM25Retriever.from_documents(all_docs)
    bm25_retriever.k = k

    # EnsembleRetriever merges both result sets
    # weights=[0.6, 0.4] means vector search is slightly more important than keyword
    hybrid_retriever = EnsembleRetriever(
        retrievers=[vector_retriever, bm25_retriever],
        weights=[0.6, 0.4],
    )

    return hybrid_retriever
