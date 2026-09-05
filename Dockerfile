# ==============================================================================
# Stage 1: Build React Frontend
# ==============================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy dependency definitions first to leverage Docker layer caching
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install

# Copy frontend source code
COPY frontend/ ./

# Remove local .env files if any leaked through, ensuring relative API calls
RUN rm -f .env .env.local .env.*.local

# Default VITE_API_URL to empty string so requests hit the hosting server directly
ENV VITE_API_URL=""

# Build the production React assets into /app/frontend/dist
RUN npm run build

# ==============================================================================
# Stage 2: Backend Runtime & Static Host (FastAPI)
# ==============================================================================
FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FRONTEND_DIST_DIR=/app/static

WORKDIR /app

# Install system dependencies for OCR (pytesseract), PDF conversion (pdf2image), PostgreSQL (psycopg2), and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    tesseract-ocr \
    poppler-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .

# Pre-install CPU-only PyTorch to avoid downloading multi-gigabyte CUDA libraries,
# then install remaining backend dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt && \
    python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('nomic-ai/nomic-embed-text-v1', trust_remote_code=True)"

# Copy backend application files
COPY backend/ /app/

# Copy built frontend assets from Stage 1 into /app/static
COPY --from=frontend-builder /app/frontend/dist /app/static

# Ensure upload directory exists
RUN mkdir -p /app/uploads

# Expose unified port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Start the unified server hosting both API and frontend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]