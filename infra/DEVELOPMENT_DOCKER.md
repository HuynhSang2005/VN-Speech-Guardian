# Hướng dẫn phát triển (dev) với Docker Compose

Mục đích: tài liệu này mô tả cách chạy toàn bộ stack (Gateway NestJS + AI Worker FastAPI + Postgres) trên máy dev bằng Docker Compose, tối ưu cho tốc độ phát triển (hot code mounts, skip load model nặng).

File liên quan
- `infra/docker-compose.yml` — cấu hình base cho tất cả môi trường (services, mạng, volumes, healthchecks, resource limits).
- `infra/docker-compose.override.yml` — override dùng cho development: thêm bind-mounts, bật ports publish, tắt load model nặng (`AI_LOAD_MODELS=false`) và các tuỳ chọn tiện lợi.
- `infra/docker-compose.prod.yml` — production profile (không dùng cho local dev).
- `scripts\docker-manager.ps1` — script helper (Windows PowerShell) để build/up/down và kiểm tra health.

Chuẩn bị
1. Cài Docker Desktop (Windows) và đảm bảo Docker daemon đang chạy.
2. Cài Python (3.11+) nếu bạn muốn chạy các script `infra/perf/*.py` hoặc các tests của `ai-worker`.
3. (Tùy chọn) Cài PowerShell 7+ để chạy script `scripts/docker-manager.ps1` mượt hơn.

Chạy stack dev (quickstart)
1. Từ thư mục gốc repo, chạy:

```powershell
# build và chạy (override sẽ được merge vào khi chỉ định)
docker-compose -f infra\docker-compose.yml -f infra\docker-compose.override.yml up -d --build
```

2. Kiểm tra trạng thái container:

```powershell
docker-compose -f infra\docker-compose.yml -f infra\docker-compose.override.yml ps
```

3. Tail logs:

```powershell
docker-compose -f infra\docker-compose.yml -f infra\docker-compose.override.yml logs -f ai-worker
docker-compose -f infra\docker-compose.yml -f infra\docker-compose.override.yml logs -f gateway
```

Sử dụng script helper
- Khởi động bằng `scripts\docker-manager.ps1` (Windows PowerShell):

```powershell
# Từ repo root
.\scripts\docker-manager.ps1 -Action up -Profile dev
# dừng
.\scripts\docker-manager.ps1 -Action down -Profile dev
# build lại
.\scripts\docker-manager.ps1 -Action build -Profile dev
```

Environment variables quan trọng
- `AI_LOAD_MODELS` (true|false) — nếu false thì `ai-worker` sẽ không load model lớn khi startup (fast dev). Override dev mặc định đặt `false`.
- `GATEWAY_API_KEY` — khoá nội bộ dùng cho Gateway ↔ AI Worker; mặc định dev là `dev-secret`.
- `POSTGRES_*` — chuỗi kết nối DB; compose đã set biến mặc định cho môi trường dev.

Publish ports (dev override)
- `ai-worker` thường publish host:8001 → container:8001 (kiểm tra `docker-compose ps` để xác nhận).
- `gateway` publish host:3001 → container:3001 (kiểm tra `docker-compose ps`).

Chạy smoke test (performance quick check)
1. Sau khi các service đã healthy (chờ `ai-worker` readyz trả true), chạy:

```powershell
python infra\perf\smoke_stream_concurrent.py --host http://localhost:8001 --api-key dev-secret --concurrency 3 --per-session 10
```

2. Kết quả hiển thị latency p50/p95 và thông số khác.

Troubleshooting nhanh
- Container không khởi động / healthcheck fail:
  - Tail logs: `docker-compose logs -f <service>`
  - Kiểm tra biến env: `docker-compose config` để xem biến merged
  - Nếu `ai-worker` bị lỗi ModuleNotFoundError khi chạy local, đảm bảo bạn chạy `uvicorn app.main:app` từ thư mục `apps/ai-worker` hoặc dùng compose (compose sẽ đặt workdir đúng)

- Port conflict: nếu host đang có cổng 8001/3001, tạm thay host port trong `docker-compose.override.yml` hoặc dừng process đang chiếm port.

- Muốn rebuild image khi thay dependencies:
  - `docker-compose -f infra\docker-compose.yml -f infra\docker-compose.override.yml up -d --build --force-recreate`

Lưu ý vận hành
- `docker-compose.override.yml` dành cho dev; trước khi deploy lên staging/prod hãy dùng `infra/docker-compose.prod.yml` hoặc pipeline CI để build/push image phù hợp.

Cập nhật tài liệu
- Nếu bạn chỉnh sửa các port, env names, hoặc thêm service, cập nhật luôn file này để developer khác dễ theo.

Liên hệ
- Nếu cần hỗ trợ trực tiếp, thêm issue trên repo hoặc ping trong nhóm dev.

---
Tài liệu này được tối ưu cho developer mới: ngắn gọn, có ví dụ PowerShell và hướng khắc phục nhanh. Nếu bạn muốn, tôi sẽ:
- Thêm checklist preflight (Docker, Python, Docker Desktop),
- Thêm script one-liner để chờ healthchecks và chạy smoke test tự động.
Bạn có muốn tôi thêm phần đó không?