# BACKLOG-024 Resolution: Absolute File Path Disclosure in Citations & Context

## Issue Summary

**ID:** BACKLOG-024  
**Category:** AI Service & RAG  
**Priority:** HIGH  
**Effort:** S (Small)

## Problem

The RAG citation builder and prompt builder both pulled the `source` metadata property directly from ChromaDB document metadata without sanitizing it. Since the document loader stores the raw filesystem path of ingested PDF files (e.g. `./ai-service/app/docs/business_guide.pdf` or even absolute paths like `/home/deploy/ai-service/app/docs/business_guide.pdf`), two issues arose:

1. **Information disclosure**: The full internal server directory structure was exposed to client browsers in chat citation bubbles, leaking deployment details to end users.
2. **Token waste**: Full filesystem paths injected into LLM prompts consumed unnecessary tokens without adding value to the model's reasoning.

## Resolution

Applied `os.path.basename()` to strip directory paths from the `source` metadata in both affected files, so only the filename (e.g. `business_guide.pdf`) is used in outputs.

### citation_service.py

```python
import os

from langchain_core.documents import Document


def build_citations(documents: list[Document], max_citations: int) -> list[dict]:
    citations: list[dict] = []
    seen: set[tuple[str, int]] = set()

    for document in documents:
        metadata = document.metadata or {}
        file_name = metadata.get("source")
        page = metadata.get("page")

        if not file_name or page is None:
            continue

        file_name = os.path.basename(str(file_name))  # Strip directory path

        key = (file_name, int(page))
        if key in seen:
            continue

        seen.add(key)
        citations.append({"file": file_name, "page": int(page)})

        if len(citations) >= max_citations:
            break

    return citations
```

### prompt_builder.py

```python
import os

# ... (in build_rag_context_text)

for document in documents:
    source = os.path.basename(document.metadata.get("source", "unknown.pdf"))  # Strip directory path
    page = document.metadata.get("page", "?")
    chunks.append(f"[Source: {source}, Page {page}]\n{document.page_content}")
```

## Files Modified

| File | Change |
| :--- | :--- |
| `ai-service/app/services/citation_service.py` | Added `import os`; applied `os.path.basename()` to `file_name` before dedup and output |
| `ai-service/app/services/prompt_builder.py` | Added `import os`; applied `os.path.basename()` to `source` in RAG context builder |

## Verification

- Citation responses now return only filenames (e.g. `{"file": "business_guide.pdf", "page": 3}`) instead of full paths.
- RAG context injected into LLM prompts uses `[Source: business_guide.pdf, Page 3]` format, reducing token usage and eliminating path disclosure.
- No internal server directory information is exposed to the client browser.

## Security Impact

This fix eliminates a low-severity information disclosure vulnerability where internal deployment directory structures were visible to authenticated wholesaler users via the Business Advisor chat interface.
