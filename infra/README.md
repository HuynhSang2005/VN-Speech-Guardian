# Infra - notes

Short docs cho dev về phần `infra/` (docker-compose) liên quan tới `ai-worker`.

## Healthcheck cho `ai-worker`

Mục đích: Docker sẽ kiểm tra endpoint `/readyz` của `ai-worker` để đánh dấu container `healthy`/`unhealthy`.

Hiện tại healthcheck dùng một probe Python (không phụ thuộc `curl`) và có `start_period` dài để cho phép thời gian warm-up khi nạp model:

- Lệnh probe (đã cấu hình trong `docker-compose.yml`):
  - `python -c "import sys,urllib.request; req=urllib.request.Request('http://127.0.0.1:8001/readyz'); r=urllib.request.urlopen(req); sys.exit(0 if r.getcode()==200 else 1)"`
- Thời gian mặc định hiện tại:
  - `interval: 10s` — kiểm tra mỗi 10 giây
  - `timeout: 5s` — timeout cho mỗi probe
  - `retries: 5` — thử lại 5 lần trước khi báo unhealthy
  - `start_period: 60s` — cho phép container khởi động và nạp model (quan trọng cho các model lớn)

### Khi cần điều chỉnh
- Nếu bạn dùng model lớn (ví dụ PhoBERT + ONNX conversion mất thời gian), tăng `start_period` lên 120s hoặc 300s tuỳ thực tế máy dev/CI.
- Nếu bạn thấy Docker báo `unhealthy` trong quá trình khởi động, kiểm tra logs của container (`docker-compose logs ai-worker`) để thấy chi tiết lỗi.
- Nếu môi trường luôn có `curl` và bạn muốn dùng probe nhẹ hơn, có thể đổi probe thành `curl -f http://127.0.0.1:8001/readyz`.

### Lý do dùng Python
- Python thường có sẵn trong image runtime của `ai-worker` và tránh phụ thuộc vào `curl` (không phải image nào cũng có curl).

### Ghi chú vận hành
- Trong CI, nếu bạn dùng prebuilt image (đã nạp sẵn model), bạn có thể giảm `start_period` để kiểm tra nhanh hơn.
- Healthcheck chỉ kiểm tra availability của endpoint `/readyz` — không kiểm tra chất lượng mô hình hay độ chính xác của detection.

---

Nếu bạn muốn mình mở PR để thay đổi `start_period` trên staging/production hoặc chuyển probe sang curl, nói mình biết môi trường mục tiêu (local/CI/prod).