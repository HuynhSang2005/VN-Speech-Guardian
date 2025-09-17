# syntax=docker/dockerfile:1

FROM python:3.11-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

# Install only runtime packages; keep image lean. build-essential removed since
# we avoid building heavy wheels in-container. If native builds are required,
# do them in CI and provide wheels or use manylinux wheel indexes.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Use production requirements (no dev/test deps) to speed up install
COPY requirements-prod.txt ./requirements-prod.txt
# Use BuildKit cache to store downloaded wheels between builds and prefer binary wheels
# Requires BuildKit-enabled docker (Docker Desktop already uses it). This speeds subsequent builds
# and reduces CPU/network pressure.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip setuptools wheel && \
    pip install --prefer-binary -r requirements-prod.txt

# Copy only package source (app) — large models are expected to be bind-mounted in compose
COPY app ./app
# Optionally copy models; for local bind mount is recommended
# COPY ../../models-and-dataset /models-and-dataset

ENV APP_HOST=0.0.0.0 APP_PORT=8001
EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
