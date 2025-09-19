# Multi-stage optimized Dockerfile for ai-worker FastAPI
# Build stage - install dependencies and compile if needed
FROM python:3.11-slim AS dependencies
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies with build cache
COPY requirements-prod.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip setuptools wheel && \
    pip install --prefer-binary -r requirements-prod.txt

# Runtime stage - minimal production image
FROM python:3.11-slim AS runner
WORKDIR /app

# Install only runtime system dependencies (no build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy installed Python packages from build stage
COPY --from=dependencies /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=dependencies /usr/local/bin /usr/local/bin

# Copy application source
COPY app ./app

# Create non-root user for security
RUN useradd --user-group --create-home --shell /bin/false --uid 1001 appuser

# Ensure appuser owns the app directory and can write to cache
RUN chown -R appuser:appuser /app
RUN mkdir -p /app/.cache && chown -R appuser:appuser /app/.cache

USER appuser

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_HOST=0.0.0.0 \
    APP_PORT=8001

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 -q -O /dev/null http://localhost:8001/readyz || exit 1

# Start application with optimized uvicorn settings for production
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1", "--access-log"]
