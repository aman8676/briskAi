import os

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import Base, engine, ensure_document_columns
import models
from routers.auth_router import router as auth_router
from dependencies import get_current_user
from models.user import User

from routers.upload_router import router as upload_router

from routers.chats_router import router as chats_router
from routers.documents_router import router as documents_router
from routers.retrieval_router import router as retrieval_router

app = FastAPI(title="RAG Chat API")

allowed_origins = os.getenv(
    "CORS_ORIGINS",
    "https://rag-studio.amanjalan.tech",
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_origin_regex=r"^https?://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RAG-Status", "X-RAG-Context-Chunks", "X-RAG-Reason"],
)

ensure_document_columns()
Base.metadata.create_all(bind=engine)

app.include_router(auth_router)

app.include_router(chats_router)
app.include_router(documents_router)
app.include_router(retrieval_router)


app.include_router(upload_router)


@app.on_event("startup")
def warmup_models():
    """Warm up the embedding model on server startup so users do not hit a 502 timeout on first upload."""
    try:
        from embeddings import get_model
        print("[startup] Warming up embedding model...")
        get_model()
        print("[startup] Embedding model is warm and ready.")
    except Exception as e:
        print(f"[startup] Warning: model warmup failed: {e}")



@app.get("/dashboard")
def dashboard(current_user: User = Depends(get_current_user)):
    """
    This is a stand-in for your real dashboard route.
    It's protected — only accessible with a valid JWT token.
    """
    return {
        "message": f"Welcome, {current_user.username}!",
        "user_id": current_user.id,
        "email": current_user.email,
    }


# ==========================================
# Static Files & React Frontend SPA Serving
# ==========================================
STATIC_DIR = None
for candidate in [
    os.getenv("FRONTEND_DIST_DIR"),
    os.path.join(os.path.dirname(__file__), "static"),
    os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"),
    os.path.join(os.path.dirname(__file__), "frontend", "dist"),
]:
    if candidate and os.path.isdir(candidate):
        STATIC_DIR = os.path.abspath(candidate)
        break

if STATIC_DIR and os.path.exists(os.path.join(STATIC_DIR, "index.html")):
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    API_PREFIXES = (
        "/auth",
        "/chat",
        "/chats",
        "/documents",
        "/retrieval",
        "/upload",
        "/dashboard",
        "/docs",
        "/redoc",
        "/openapi.json",
    )

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
    def serve_frontend(full_path: str):
        normalized = "/" + full_path.lstrip("/")
        if any(normalized == prefix or normalized.startswith(prefix + "/") for prefix in API_PREFIXES):
            raise HTTPException(status_code=404, detail="API route not found")

        file_path = os.path.join(STATIC_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)

        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
else:
    @app.api_route("/", methods=["GET", "HEAD"])
    def root():
        return {"status": "ok", "message": "API is running"}

