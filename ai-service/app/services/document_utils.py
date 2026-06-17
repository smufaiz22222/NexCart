import os


def normalize_chunk_metadata(
    metadata: dict | None, page_is_zero_based: bool = False
) -> dict:
    metadata = dict(metadata or {})
    raw_source = metadata.get("source") or metadata.get("file") or "unknown.pdf"
    source = os.path.basename(str(raw_source))

    raw_page = metadata.get("page", 0)
    try:
        page = int(raw_page)
    except (TypeError, ValueError):
        page = 0

    if page_is_zero_based:
        page += 1

    metadata["source"] = source
    metadata["page"] = max(page, 1)
    return metadata
