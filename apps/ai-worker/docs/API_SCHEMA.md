# API Schema - AI Worker

Tài liệu này mô tả chi tiết các endpoint chính, schema request/response, và ví dụ.

## 1) Health & Readiness

# API Schema – AI Worker (Phiên bản dành cho dev Việt)

Tài liệu này mô tả các endpoint chính của AI Worker, hợp đồng request/response, và chính sách bảo mật liên quan tới Gateway (cách Gateway cung cấp `x-api-key` và cơ chế forward header).

## 1) Health & Readiness

GET /readyz

Response (200):

```json
{
  "status": "ok|starting",
  "phobert_dir": true,
  "phobert_onnx_dir": true,
  "phobert_loaded": true
}
```

Trường boolean giúp Gateway biết model đã được nạp hay chưa (useful để báo trạng thái readiness).

## 2) ASR (Streaming / chunked)

POST /asr/stream
- Content-Type: application/octet-stream
- Headers:
  - `x-session-id`: string (bắt buộc) — id phiên do Gateway tạo, dùng để map audio → client
  - `x-chunk-seq`: int (tuỳ chọn) — sequence cho ordering nếu cần
  - `x-final`: boolean (tuỳ chọn) — đánh dấu chunk cuối của 1 utterance
  - `x-api-key`: string (bắt buộc) — khoá chia sẻ giữa Gateway và AI Worker

Body: raw bytes PCM16LE 16kHz mono (Gateway chịu trách nhiệm convert nếu cần)

Response (200) – ví dụ:

```json
{
  "status": "ok",
  "partial": { "text": "..." },
  "final": { "text": "...", "words": [] },
  "detections": [
    { "label": "OFFENSIVE", "score": 0.92, "startMs": 100, "endMs": 800, "snippet": "..." }
  ]
}
```

Lưu ý lỗi phổ biến:
- 400: thiếu `x-session-id`, body rỗng, hoặc format PCM không hợp lệ
- 401: `x-api-key` không hợp lệ
- 429: backpressure / rate limiting (Gateway nên áp dụng retry/backoff)

## 3) Moderation (PhoBERT)

POST /moderation
- Content-Type: application/json
- Headers: `x-api-key` (bắt buộc)

Request body:

```json
{ "inputs": ["câu 1", "câu 2"] }
```

Response (200) – ví dụ:

```json
{
  "results": [
    { "label": "safe", "score": 0.98 },
    { "label": "block", "score": 0.91 }
  ]
}
```

`label` sẽ là một trong `{"safe","warn","block"}` (tương ứng với map label → id trong cấu hình). `score` là xác suất confidence (0..1).

### Gateway → AI Worker: cơ chế `x-api-key` và chính sách bảo mật

1) Cách hoạt động cơ bản
- Gateway (ví dụ: NestJS) giữ một secret dùng chung với AI Worker. Thông thường Gateway cấu hình biến môi trường `GATEWAY_API_KEY` và khi gọi AI Worker sẽ thêm header `x-api-key: <secret>`.

2) Ví dụ (Node/NestJS, axios) — mã mẫu để dev tham khảo:

```ts
// Ví dụ trong Gateway service
const AI_BASE = process.env.AI_SERVICE_BASE_URL || 'http://ai-worker:8001';
const KEY = process.env.GATEWAY_API_KEY || 'dev-secret';

// Gọi endpoint moderation
await axios.post(`${AI_BASE}/moderation`, { inputs }, { headers: { 'x-api-key': KEY } });
```

3) Forwarding user context (chỉ khi thực sự cần)
- Nếu Gateway cần cung cấp context cho mục đích logging/audit, có thể forward những header nhẹ như `x-user-id` (UUID) hoặc `x-request-id`.
- Tuyệt đối không forward sensitive PII (mật khẩu, token hoàn chỉnh) trừ khi được mã hoá và có chính sách rõ ràng.

Ví dụ forward:

```ts
await axios.post(`${AI_BASE}/moderation`, { inputs }, {
  headers: {
    'x-api-key': KEY,
    'x-user-id': userId,        // chỉ ID nhẹ, không phải token
    'x-request-id': traceId
  }
});
```

4) Khuyến nghị bảo mật (best practices)
- Dùng HTTPS / TLS giữa Gateway và AI Worker trong môi trường production.
- Giữ `GATEWAY_API_KEY` an toàn (secrets manager), định kỳ rotate.
- Giới hạn phép gọi (rate limit) ở Gateway trước khi tới AI Worker để tránh DOS.
- AI Worker nên validate `x-api-key` sớm và trả 401 nếu không hợp lệ.
- (Tùy chọn) Triển khai mTLS hoặc IP allowlist nếu cần bảo mật cao hơn.
- Ghi log có kiểm soát: log `x-request-id`, `x-user-id` (nếu forward) cho audit, nhưng tránh log text đầy đủ của audio hoặc các PII.

5) Trust boundary
- AI Worker mặc định chỉ tin request có `x-api-key` hợp lệ. Nếu AI Worker tiếp nhận trực tiếp từ client (không qua Gateway), cần áp dụng auth khác (ví dụ OAuth/JWT) và quy trình chứng thực rõ ràng.

## 4) Lỗi & mapping HTTP

- 400: Bad request (ví dụ: missing header, malformed body)
- 401: Unauthorized (`x-api-key` không hợp lệ)
- 429: Too many requests / backpressure
- 500: Internal server error (AI inference lỗi)

## 5) Ghi chú triển khai & vận hành

- Kích thước chunk: Gateway nên gửi các payload ~200–1000ms để cân bằng latency và overhead.
- Contract: AI Worker chấp nhận PCM16LE 16kHz mono. Nếu Gateway gửi định dạng khác, Gateway phải convert.
- Khi có sự cố model (ví dụ PhoBERT chưa sẵn sàng), AI Worker trả 503 hoặc trong readyz báo phobert_loaded=false.

---

Tài liệu này viết dành cho dev Việt; nếu cần ví dụ code bổ sung (NestJS middleware, ví dụ validate `x-api-key`), mình có thể thêm nhanh.
