#!/usr/bin/env python3
"""
Evaluate moderation quality across a variety of Vietnamese bad-keyword scenarios.

This script uses the app.services.bert_service.predict() which will:
- Use ONNXRuntime/PyTorch model if loaded and provided via app.state.models
- Otherwise fall back to the heuristic detector (fast path)

Usage:
  # Heuristic-only (no heavy deps needed)
  python apps/ai-worker/tools/eval_bad_keywords.py

  # With ONNX model (recommended if available)
  PHOBERT_ONNX_DIR=apps/ai-worker/app/models/bert-finetuned-onnx \
  USE_ONNXRUNTIME=true AI_LOAD_MODELS=true \
  python apps/ai-worker/tools/eval_bad_keywords.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any


THIS_FILE = Path(__file__).resolve()
AI_WORKER_DIR = THIS_FILE.parents[1]
APP_DIR = AI_WORKER_DIR / "app"
if str(AI_WORKER_DIR) not in sys.path:
    sys.path.insert(0, str(AI_WORKER_DIR))

from app.services.bert_service import predict  # type: ignore


def load_optional_onnx() -> dict[str, Any] | None:
    """Try to load tokenizer + ONNX session if env configured; else None."""
    onnx_dir = os.getenv("PHOBERT_ONNX_DIR", "").strip()
    use_ort = os.getenv("USE_ONNXRUNTIME", "false").lower() in ("1", "true", "yes")
    if not (onnx_dir and use_ort):
        return None
    try:
        from transformers import AutoTokenizer  # type: ignore
        import onnxruntime as ort  # type: ignore

        model_path = Path(onnx_dir) / "model.onnx"
        if not model_path.exists():
            print(f"[warn] ONNX model not found at {model_path}; fallback to heuristic.")
            return None
        tokenizer = AutoTokenizer.from_pretrained(onnx_dir, local_files_only=True)
        session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])  # noqa: E501
        return {"tokenizer": tokenizer, "onnx_session": session}
    except Exception as e:
        print(f"[warn] Failed to init ONNXRuntime path: {e}; fallback to heuristic.")
        return None


def scenarios() -> list[tuple[str, list[str]]]:
    """Return list of (title, inputs) to evaluate."""
    return [
        ("Single bad keyword", [
            "đồ ngu",
            "dm",
            "cc",
            "fuck",
        ]),
        ("Short phrase with insult", [
            "mày đồ ngu",
            "đồ khốn",
            "đồ mất dạy",
        ]),
        ("Sentence with scattered bad words", [
            "Tao nói mày đồ ngu, hiểu chưa",
            "Mày cc quá nên tao dm mày",
            "Không nên nói fuck người khác đâu",
        ]),
        ("Mixed safe and warn", [
            "Cảnh báo lần cuối trước khi báo cáo",
            "Xin chào bạn, hôm nay ổn chứ?",
            "Nội dung này cần warning nhẹ",
        ]),
        ("Clean sentences", [
            "Xin chúc mừng, bạn đã hoàn thành bài kiểm tra",
            "Hôm nay trời đẹp quá",
            "Cảm ơn bạn đã hỗ trợ",
        ]),
    ]


def main() -> int:
    phobert = load_optional_onnx()
    total, correct_like = 0, 0

    print("=== Moderation Evaluation ===")
    print(f"Use ONNX: {bool(phobert and phobert.get('onnx_session'))}")
    for title, inputs in scenarios():
        print(f"\n--- {title} ---")
        outputs = predict(inputs, phobert)
        for s, o in zip(inputs, outputs):
            total += 1
            label = o.get("label")
            score = o.get("score")
            # Heuristic expected: bad → block, warn keywords → warn, else safe
            sl = s.lower()
            if any(k in sl for k in ["đồ ngu", "chửi", "fuck", "dm", "cc", "khốn", "mất dạy"]):
                expected = "block"
            elif any(k in sl for k in ["cảnh báo", "warning"]):
                expected = "warn"
            else:
                expected = "safe"
            correct = (label == expected)
            correct_like += int(correct)
            print(f"[{ 'OK' if correct else '??' }] {s} => {label} ({score:.2f}) | expected={expected}")

    acc = (correct_like / total) * 100.0 if total else 0.0
    print(f"\nOverall agreement with expected (heuristic rule): {acc:.1f}% ({correct_like}/{total})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
