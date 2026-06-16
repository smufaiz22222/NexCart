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

        key = (str(file_name), int(page))
        if key in seen:
            continue

        seen.add(key)
        citations.append({"file": str(file_name), "page": int(page)})

        if len(citations) >= max_citations:
            break

    return citations
