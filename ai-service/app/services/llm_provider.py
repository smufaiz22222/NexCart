import os
from functools import lru_cache


@lru_cache(maxsize=1)
def get_llm():
    llm_provider = os.getenv("LLM_PROVIDER", "gemini").lower()

    if llm_provider == "ollama":
        from langchain_community.llms import Ollama

        model = os.getenv("OLLAMA_MODEL", "mistral")
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        print(f"[LLM] Ollama: {model}")
        return Ollama(model=model, base_url=base_url)

    if llm_provider == "openrouter":
        from langchain_openai import ChatOpenAI

        print(f"[LLM] OpenRouter: {os.getenv('OPENROUTER_MODEL')}")
        return ChatOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY"),
            model=os.getenv("OPENROUTER_MODEL", "deepseek/deepseek-r1:free"),
        )

    if llm_provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is required when LLM_PROVIDER=gemini")

        model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        print(f"[LLM] Gemini: {model}")
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key,
            temperature=0.2,
        )

    raise ValueError(f"Unknown LLM_PROVIDER: {llm_provider}")
