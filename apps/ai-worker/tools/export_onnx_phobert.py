"""
Export a fine-tuned PhoBERT (HF Transformers) checkpoint to ONNX using Optimum.

Usage (PowerShell):
  python apps/ai-worker/tools/export_onnx_phobert.py ^
    --src apps/ai-worker/app/models/bert-finetuned ^
    --dst apps/ai-worker/app/models/bert-finetuned-onnx

This produces model.onnx plus config and tokenizer files in the destination.
"""
import argparse
import os
import shutil
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="Path to HF checkpoint directory")
    ap.add_argument("--dst", required=True, help="Output directory for ONNX model")
    # Opset >=14 is required for scaled_dot_product_attention; use 17 by default for safety
    ap.add_argument("--opset", type=int, default=17)
    args = ap.parse_args()

    src = Path(args.src)
    dst = Path(args.dst)
    dst.mkdir(parents=True, exist_ok=True)

    # Lazy import to avoid hard dependency if not used
    try:
        # Optimum >= 1.11
        from optimum.exporters.onnx import convert
        convert(framework="pt", model=str(src), output=str(dst), opset=args.opset)
    except Exception:
        try:
            # Fallback: use CLI module
            import subprocess, sys
            cmd = [
                sys.executable,
                "-m",
                "optimum.exporters.onnx",
                "--model",
                str(src),
                str(dst),
                "--task",
                "text-classification",
                "--opset",
                str(args.opset),
            ]
            subprocess.check_call(cmd)
        except Exception as e:  # pragma: no cover
            raise SystemExit(
                f"ONNX export failed. Ensure optimum/onnxruntime installed. Error: {e}"
            )

    # Copy tokenizer files (usually already exported, but ensure present)
    for name in ["tokenizer.json", "vocab.json", "merges.txt", "special_tokens_map.json", "tokenizer_config.json", "config.json"]:
        p = src / name
        if p.exists() and not (dst / name).exists():
            shutil.copy2(p, dst / name)

    print(f"Exported ONNX model to {dst}")


if __name__ == "__main__":
    main()
