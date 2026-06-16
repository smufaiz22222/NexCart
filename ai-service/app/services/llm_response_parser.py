def extract_text_from_llm_response(response) -> str:
    content = getattr(response, "content", response)

    if isinstance(content, str):
        return content.strip()

    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                text = item.strip()
                if text:
                    parts.append(text)
                continue

            if isinstance(item, dict):
                text = item.get("text")
                if isinstance(text, str) and text.strip():
                    parts.append(text.strip())
                continue

            item_text = getattr(item, "text", None)
            if isinstance(item_text, str) and item_text.strip():
                parts.append(item_text.strip())

        if parts:
            return "\n".join(parts).strip()

    fallback = str(content if content is not None else response).strip()
    return fallback or "I don't have enough information to determine that."
