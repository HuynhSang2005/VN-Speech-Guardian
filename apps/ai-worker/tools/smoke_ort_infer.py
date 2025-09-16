#!/usr/bin/env python3
"""
Quick smoke test for ONNXRuntime inference with our PhoBERT classifier.
Loads tokenizer + ONNX model and calls app.services.bert_service.predict.

Usage: run with the AI worker venv Python from repo root, e.g.
  apps/ai-worker/.venv/Scripts/python.exe apps/ai-worker/tools/smoke_ort_infer.py
"""
from __future__ import annotations

import sys
import argparse
from pathlib import Path

# Ensure we can import "app" package
THIS_FILE = Path(__file__).resolve()
AI_WORKER_DIR = THIS_FILE.parents[1]
APP_DIR = AI_WORKER_DIR / "app"
if str(AI_WORKER_DIR) not in sys.path:
    sys.path.append(str(AI_WORKER_DIR))

from app.services.bert_service import predict  # type: ignore


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--onnx-dir", default=None, help="Path to ONNX dir (defaults to app/models/bert-finetuned-onnx)")
    args = ap.parse_args()

    onnx_dir = Path(args.onnx_dir) if args.onnx_dir else (APP_DIR / "models" / "bert-finetuned-onnx")
    model_path = onnx_dir / "model.onnx"
    if not model_path.exists():
        print(f"ONNX model not found at: {model_path}")
        return 2

    # Lazy imports to avoid impacting test startup
    from transformers import AutoTokenizer  # type: ignore
    import onnxruntime as ort  # type: ignore

    tokenizer = AutoTokenizer.from_pretrained(str(onnx_dir), local_files_only=True)
    session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])  # noqa: E501

    phobert = {"tokenizer": tokenizer, "onnx_session": session}

    texts = [
        "đồ ngu quá",  # likely block
        "xin chào bạn",  # likely safe
        "cảnh báo lần cuối",  # likely warn
    ]
    outputs = predict(texts, phobert)
    print("Inputs:")
    for t in texts:
        print(" -", t)
    print("\nOutputs:")
    for out in outputs:
        print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
