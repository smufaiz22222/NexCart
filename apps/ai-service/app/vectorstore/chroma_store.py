# chroma_store.py
# Manages the ChromaDB vector store.
# get_vectorstore() returns the live collection.
# get_retriever()   returns a LangChain retriever ready for RAG.

import os
from langchain_community.vectorstores import Chroma
from app.embeddings.embedder import get_embedder

CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db")
COLLECTION_NAME = "nexcart_business_docs"

def get_vectorstore() -> Chroma:
    """Return (or create) the ChromaDB collection."""
    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=get_embedder(),
        persist_directory=CHROMA_PATH,
    )

def get_retriever(k: int = 6):
    """Return a LangChain retriever that fetches the top-k most relevant chunks."""
    vectorstore = get_vectorstore()
    return vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": k},
    )

def add_documents(docs: list):
    """Add a list of LangChain Document objects into ChromaDB."""
    vectorstore = get_vectorstore()
    vectorstore.add_documents(docs)
    print(f"[ChromaDB] Added {len(docs)} chunks to collection '{COLLECTION_NAME}'")