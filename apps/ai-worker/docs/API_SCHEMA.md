# API Schema - AI Worker

Tài liệu này mô tả chi tiết các endpoint chính, schema request/response, và ví dụ.

## 1) Health & Readiness

GET /readyz

Response (200):

```json
{
  "status": "ok|starting",
  "phobert_dir": true|false,
  "phobert_onnx_dir": true|false,
  "phobert_loaded": true|false
}
```

## 2) ASR Streaming

POST /asr/stream
- Content-Type: application/octet-stream
- Headers:
  - `x-session-id`: string (bắt buộc)
  - `x-chunk-seq`: int (tuỳ chọn)
  - `x-final`: boolean (tuỳ chọn, đánh dấu chunk cuối)
  - `x-api-key`: string (bắt buộc)

Body: raw PCM16LE 16kHz mono bytes

Response (200):

```json
{
  "status":"ok",
  "partial": { "text": "..." },      // nếu x-final không true
  "final": { "text": "...", "words": [ /* optional words/timestamps */ ] },
  "detections": [
    {"label":"OFFENSIVE","score":0.92,"startMs":100,"endMs":800,"snippet":"..."}
  ]
}
```

Errors:
- 400: missing x-session-id, empty body, malformed PCM16LE
- 401: invalid api key
- 429: too many chunks (rate limiting)

## 3) Moderation

POST /moderation
- Content-Type: application/json
- Headers: `x-api-key` required

Body:

```json
{ "inputs": ["câu 1", "câu 2"] }
```

Response (200):

```json
{
  "results": [
    {"label":"safe","score":0.98},
    {"label":"block","score":0.91}
  ]
}
```

Notes:
- `label` là chuỗi trong `{"safe","warn","block"}` theo cấu hình.
- `score` là xác suất/confidence trong khoảng [0,1].
