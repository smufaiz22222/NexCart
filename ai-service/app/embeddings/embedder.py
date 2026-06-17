from langchain_huggingface import HuggingFaceEmbeddings
from functools import lru_cache
import os

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")


@lru_cache(maxsize=1)
def get_embedder() -> HuggingFaceEmbeddings:
    print(f"[Embedder] Loading model: {EMBEDDING_MODEL}")
    return HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )
