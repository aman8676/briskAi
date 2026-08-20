import os

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
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
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RAG-Status", "X-RAG-Context-Chunks", "X-RAG-Reason"],
)

Base.metadata.create_all(bind=engine)

app.include_router(auth_router)

app.include_router(chats_router)
app.include_router(documents_router)
app.include_router(retrieval_router)


app.include_router(upload_router)



@app.get("/")
def root():
    return {"status": "ok", "message": "API is running"}


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
