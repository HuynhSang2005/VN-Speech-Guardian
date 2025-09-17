#!/usr/bin/env bash
# Setup script for ai-worker (Linux / macOS)
# Creates a venv, installs required packages and optional ONNX deps

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AI_DIR="$ROOT_DIR/apps/ai-worker"

echo "Setting up ai-worker in: $AI_DIR"
cd "$AI_DIR"

# Create venv
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate

python -m pip install -U pip setuptools wheel
python -m pip install -r requirements.txt

echo "Optional: install ONNX export/runtime (optimum + onnxruntime)"
echo "If you need ONNX export or ORT inference, run:"
echo "  python -m pip install -U 'optimum[onnxruntime]' onnxruntime transformers"

echo "Setup complete. Activate venv with: source .venv/bin/activate"
