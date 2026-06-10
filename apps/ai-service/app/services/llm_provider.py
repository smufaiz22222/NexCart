import os
from functools import lru_cache

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama")

@lru_cache(maxsize=1)
def get_llm():
    if LLM_PROVIDER == "ollama":
        from langchain_community.llms import Ollama
        model   = os.getenv("OLLAMA_MODEL", "mistral")
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        print(f"[LLM] Ollama: {model}")
        return Ollama(model=model, base_url=base_url)

    elif LLM_PROVIDER == "openrouter":
        from langchain_openai import ChatOpenAI
        print(f"[LLM] OpenRouter: {os.getenv('OPENROUTER_MODEL')}")
        return ChatOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY"),
            model=os.getenv("OPENROUTER_MODEL", "deepseek/deepseek-r1:free"),
        )

    raise ValueError(f"Unknown LLM_PROVIDER: {LLM_PROVIDER}")