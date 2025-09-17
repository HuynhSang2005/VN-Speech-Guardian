# Hướng dẫn cài đặt & phát triển (DEV) cho AI Worker

Mục tiêu file này: hướng dẫn dev mới cách chuẩn bị môi trường, chạy unit/e2e, và debug nhanh.

1) Tạo môi trường & cài dependencies

PowerShell:

```powershell
cd apps/ai-worker
python -m venv .venv
.\.venv\Scripts\Activate
pip install -r requirements.txt
# Nếu muốn export ONNX / chạy ORT thử nghiệm
pip install -r requirements-onnx.txt
```

Bash:

```bash
cd apps/ai-worker
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-onnx.txt
```

2) Chạy unit tests

```powershell
cd apps/ai-worker
.\.venv\Scripts\python.exe -m pytest --cov=. --cov-report=term-missing
```

3) Chạy server local để debug

```powershell
cd apps/ai-worker
.\.venv\Scripts\python.exe -m uvicorn app.main:create_app --host 0.0.0.0 --port 8001 --reload
```

4) Thử benchmark local

```powershell
.\.venv\Scripts\python.exe tools\benchmarks.py
```

5) Tips nhanh
- Nếu model ONNX không có, service sẽ fallback heuristic.
- Đặt env `AI_LOAD_MODELS=true` để service tự load model khi khởi động.

6) Export ONNX (nếu cần)

Nếu bạn đã có checkpoint fine-tuned (ví dụ `app/models/bert-finetuned`) hoặc muốn export trực tiếp từ `phobert-hsd` (repo có sẵn), dùng script export:

PowerShell:

```powershell
cd apps/ai-worker
.\.venv\Scripts\Activate.ps1
python tools\export_onnx_phobert.py --src app\models\phobert-hsd --dst app\models\bert-finetuned-onnx
```

Bash:

```bash
cd apps/ai-worker
source .venv/bin/activate
python tools/export_onnx_phobert.py --src app/models/phobert-hsd --dst app/models/bert-finetuned-onnx
```

Sau khi export thành công, `app/models/bert-finetuned-onnx/model.onnx` sẽ tồn tại cùng tokenizer/config.

7) Kiểm tra ONNXRuntime inference (smoke test)

Trong venv, chạy:

```powershell
python tools\smoke_ort_infer.py
```

Nếu mọi thứ OK, script sẽ in inputs và outputs (label + score).

8) Script helper

Có một script để thiết lập nhanh trên Linux/macOS: `scripts/setup_ai_worker.sh`. Trên Windows bạn đã có `scripts/setup_ai_worker.ps1`.

