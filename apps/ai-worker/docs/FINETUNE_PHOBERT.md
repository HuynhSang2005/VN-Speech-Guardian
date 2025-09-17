```markdown
# Hướng dẫn fine-tune PhoBERT (phobert-hsd) và export ONNX

Tài liệu này cung cấp các bước rõ ràng để bạn fine-tune PhoBERT, export sang ONNX và tích hợp vào `ai-worker`.

## 1) Lý do và quản lý model trong repo

- Các checkpoint fine-tuned thường rất lớn (hàng trăm MB → GB). Không khuyến nghị commit trực tiếp vào git. Dùng Git LFS, model registry, hoặc lưu trên S3/Artifactory.
- Repo giữ `phobert-hsd` (ready-to-use) để dev nhanh; nếu bạn có checkpoint riêng, đặt nó vào `app/models/<name>` và trỏ `PHOBERT_CHECKPOINT_DIR`.

## 2) Chuẩn bị môi trường

PowerShell:

```powershell
cd apps/ai-worker
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Bash:

```bash
cd apps/ai-worker
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Nếu cần export ONNX: `pip install -r requirements-onnx.txt` hoặc `python -m pip install -U "optimum[onnxruntime]" onnxruntime`

## 3) Fine-tune nhanh (ví dụ)

```bash
python tools/train_phobert.py \
  --dataset app/datasets/viHSD/ViHSD.csv \
  --outdir app/models/phobert-hsd \
  --epochs 3 --batch-size 8
```

Sau khi train xong, kiểm tra folder `app/models/phobert-hsd`.

## 4) Export ONNX (khuyến nghị cho CPU inference)

Ví dụ export từ `phobert-hsd` (hoặc từ checkpoint khác):

```bash
python tools/export_onnx_phobert.py --src app/models/phobert-hsd --dst app/models/bert-finetuned-onnx --opset 17
```

Kết quả: thư mục `app/models/bert-finetuned-onnx` có `model.onnx` và các file tokenizer/config.

Lưu ý:
- Nếu export lỗi, kiểm tra phiên bản `optimum`, `onnx`, `transformers` và `torch` tương thích.
- Warnings từ exporter (tracer/onnx warnings) thường không ảnh hưởng nếu script báo `Exported ONNX model to ...`.

## 5) Chạy service với ONNX

Thiết lập env và khởi động:

```bash
export PHOBERT_ONNX_DIR=app/models/bert-finetuned-onnx
export USE_ONNXRUNTIME=true
export AI_LOAD_MODELS=true
export GATEWAY_API_KEY=dev-secret
python -m uvicorn app.main:create_app --host 0.0.0.0 --port 8001
```

## 6) Nếu người khác clone repo

- Không bắt buộc phải fine-tune ngay. Service có fallback heuristic để dev nhanh.
- Để có kết quả production-quality, họ cần download checkpoint `phobert-hsd` hoặc fine-tune rồi export ONNX như hướng dẫn.

## 7) Các lệnh nhanh

- Train: `python tools/train_phobert.py --dataset app/datasets/viHSD/ViHSD.csv --outdir app/models/phobert-hsd --epochs 3`
- Export ONNX: `python tools/export_onnx_phobert.py --src app/models/phobert-hsd --dst app/models/bert-finetuned-onnx`
- Smoke test ORT: `python tools/smoke_ort_infer.py`

---

Nếu muốn, tôi có thể thêm script tự động tải `phobert-hsd` từ artifact storage (nếu bạn cung cấp URL) hoặc thiết lập CI để validate ONNX artifacts.

```# Fine-tune PhoBERT (phobert-hsd) and repo housekeeping

This document explains:

- How to keep `phobert-base` as optional and remove the heavy `bert-finetuned` folder from git history.
- How to fine-tune PhoBERT on the provided dataset and export ONNX for runtime.
- What a user who clones this repo must do to reproduce `phobert-hsd` and ONNX artifacts.

## 1) Why remove `bert-finetuned` from Git

`apps/ai-worker/app/models/bert-finetuned` contains fine-tuned model checkpoints (safetensors / optimizer / checkpoints). These are large and usually tracked via Git LFS or removed from git history. We keep `phobert-base` tokenizer as a lightweight optional checkpoint so users can start training quickly.

If you want to remove the `bert-finetuned` directory from the repository history (already done in this branch via `git lfs migrate`), here are commands to remove it locally and in history if needed:

PowerShell (careful - history rewrite):

```powershell
# 1. Ensure you have a clean working tree
git status

# 2. Remove the folder and commit
git rm -r --cached apps/ai-worker/app/models/bert-finetuned
git commit -m "chore: remove heavy bert-finetuned from history (use LFS or external storage)"

# 3. Optionally rewrite history to purge large files (advanced):
# git filter-repo --path apps/ai-worker/app/models/bert-finetuned --invert-paths
```

Note: Only do history rewrite on a new branch or coordinate with your team. We recommend storing model artifacts in a model registry or S3 and tracking only metadata in git.

## 2) Fine-tune PhoBERT (PowerShell / bash examples)

Prerequisites:

- Python 3.10+ (venv recommended)
- `pip install -r apps/ai-worker/requirements.txt` (add `optimum[onnxruntime]` if you plan to export to ONNX)
- FFmpeg available on PATH (for ASR parts)

Example (PowerShell):

```powershell
cd apps/ai-worker
python -m venv .venv
.\.venv\Scripts\Activate
pip install -r requirements.txt
pip install -r requirements-onnx.txt  # optional for ONNX export

# Train using the included script (adjust args as needed)
python tools/train_phobert.py --dataset app/datasets/viHSD/ViHSD.csv --outdir app/models/phobert-hsd --epochs 3 --batch-size 8

# After training, verify model exists
ls app/models/phobert-hsd
```

Example (bash):

```bash
cd apps/ai-worker
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-onnx.txt  # optional
python tools/train_phobert.py --dataset app/datasets/viHSD/ViHSD.csv --outdir app/models/phobert-hsd --epochs 3 --batch-size 8
```

## 3) Export ONNX for inference (optional but recommended)

We recommend exporting to ONNX for production CPU inference using ONNX Runtime. Use `optimum` or the provided helper script.

PowerShell:

```powershell
cd apps/ai-worker
# Ensure optimum and onnxruntime installed
pip install -r requirements-onnx.txt

python tools/export_onnx_phobert.py --src app/models/phobert-hsd --dst app/models/bert-finetuned-onnx --opset 17

# Verify ONNX model
ls app/models/bert-finetuned-onnx
```

Notes:

- `optimum` exports may need additional versions of `transformers` / `onnx` installed. If export fails, try the fallback CLI in the script which calls `python -m optimum.exporters.onnx`.
- The target ONNX directory should contain `model.onnx` and tokenizer files (`vocab.txt`, `tokenizer_config.json`, `config.json`) so the service can load them locally.

## 4) If someone clones this repo — do they need to fine-tune?

Short answer: No, they do not strictly need to fine-tune to run the AI worker in development — the service includes a heuristic fallback and `phobert-base` tokenizer for quick experimentation.

However, for production-quality moderation using `phobert-hsd` (our fine-tuned model), a user must either:

1. Download the pre-trained `phobert-hsd` checkpoint (if provided externally by the project) and place it under `apps/ai-worker/app/models/phobert-hsd` (or set `PHOBERT_CHECKPOINT_DIR` to point to it), OR
2. Fine-tune `phobert-base` on the dataset (ViHSD) using `tools/train_phobert.py`, then optionally export to ONNX with `tools/export_onnx_phobert.py` for faster CPU inference.

Why export to ONNX?

- ONNX Runtime is typically faster and more memory-efficient on CPU than PyTorch for transformer inference.
- Exporting to ONNX enables `USE_ONNXRUNTIME=true` and the service will load the ONNX session for lower-latency moderation.

Recommended workflow for a user cloning the repo:

1. Create venv and install deps
2. Optionally train (or download) `phobert-hsd` into `app/models/phobert-hsd`
3. Export to ONNX into `app/models/bert-finetuned-onnx`
4. Start the service with environment variables:

```powershell
$env:PHOBERT_ONNX_DIR="apps/ai-worker/app/models/bert-finetuned-onnx"
$env:USE_ONNXRUNTIME="true"
$env:GATEWAY_API_KEY="dev-secret"
.\.venv\Scripts\python.exe -m uvicorn app.main:create_app --host 0.0.0.0 --port 8001
```

If the user does not want to fine-tune or use ONNX, the service still works with a heuristic fallback. This makes cloning and experimenting trivial.

## 5) Quick commands recap

- Train:
  - `python tools/train_phobert.py --dataset app/datasets/viHSD/ViHSD.csv --outdir app/models/phobert-hsd --epochs 3`
- Export ONNX:
  - `python tools/export_onnx_phobert.py --src app/models/phobert-hsd --dst app/models/bert-finetuned-onnx`
- Run service (ONNX):
  - `PHOBERT_ONNX_DIR=apps/ai-worker/app/models/bert-finetuned-onnx USE_ONNXRUNTIME=true AI_LOAD_MODELS=true GATEWAY_API_KEY=dev-secret uvicorn app.main:create_app --host 0.0.0.0 --port 8001`

---

If you want, I can now:

- Remove the `apps/ai-worker/app/models/bert-finetuned` directory from the repo (or help create a branch + history rewrite), or
- Add a small script to download a shared `phobert-hsd` release artifact from a model storage if you prefer not to store models in git.
