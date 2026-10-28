# Production Dockerfile for Reva Hub (FastAPI + Prebuilt React Frontend)
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies for asyncpg and pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    libjpeg-dev \
    libpng-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code and pre-compiled frontend assets
COPY backend/ ./backend/
COPY frontend/dist/ ./frontend/dist/

ENV FRONTEND_DIST=/app/frontend/dist
ENV ENVIRONMENT=production

EXPOSE 8000 10000

WORKDIR /app/backend
CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
