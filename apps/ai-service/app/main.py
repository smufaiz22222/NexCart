from dotenv import load_dotenv
load_dotenv()  # must be first line before any other imports

from fastapi import FastAPI
from app.routes.chat import router as chat_router
from app.routes.ingest import router as ingest_router

app = FastAPI(title="NexCart AI Business Advisor")

app.include_router(chat_router)
app.include_router(ingest_router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "NexCart AI"}