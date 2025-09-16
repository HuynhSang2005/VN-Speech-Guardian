#!/usr/bin/env python3
"""
End-to-end moderation smoke using ONNXRuntime path without starting a server.
Sets env to load ONNX model, creates FastAPI app, and calls /readyz and /moderation.
"""
from __future__ import annotations

import os
import sys
import json
import argparse
from pathlib import Path


def main(onnx_dir: Path | None = None) -> int:
    this_file = Path(__file__).resolve()
    ai_worker_dir = this_file.parents[1]
    onnx_dir = onnx_dir or (ai_worker_dir / "app" / "models" / "bert-finetuned-onnx")
    if not (onnx_dir / "model.onnx").exists():
        print(f"Missing ONNX model at: {onnx_dir / 'model.onnx'}")
        return 2

    # Make app package importable
    app_pkg_parent = (ai_worker_dir)
    if str(app_pkg_parent) not in sys.path:
        sys.path.insert(0, str(app_pkg_parent))

    # Configure env for the app
    os.environ.setdefault("PHOBERT_ONNX_DIR", str(onnx_dir))
    os.environ.setdefault("USE_ONNXRUNTIME", "true")
    os.environ.setdefault("AI_LOAD_MODELS", "true")
    os.environ.setdefault("GATEWAY_API_KEY", "dev-secret")

    # Lazy imports after env is in place
    from app.main import create_app  # type: ignore
    from fastapi.testclient import TestClient  # type: ignore

    app = create_app()
    with TestClient(app) as client:
        rz = client.get("/readyz")
        print("/readyz:", rz.status_code, rz.json())

        body = {"inputs": ["xin chào bạn", "đồ ngu quá", "cảnh báo lần cuối"]}
        mod = client.post("/moderation", headers={"x-api-key": "dev-secret"}, json=body)
        print("/moderation:", mod.status_code, mod.json())

    return 0


if __name__ == "__main__":
    import anyio

    ap = argparse.ArgumentParser()
    ap.add_argument("--onnx-dir", default=None, help="Path to ONNX dir (defaults to app/models/bert-finetuned-onnx)")
    args = ap.parse_args()
    onnx_dir = Path(args.onnx_dir) if args.onnx_dir else None
    raise SystemExit(main(onnx_dir))
