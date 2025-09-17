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
