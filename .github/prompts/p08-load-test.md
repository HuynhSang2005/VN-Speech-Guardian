# P08 – Load Test 3 Sessions

Mục tiêu: p95 final latency &lt;2 s, CPU &lt;70 %

## Step nhỏ
1. scripts/load.js – dùng socket.io-client spawn 3 connection.
2. Phát WAV tiếng Việt 60 s có từ xấu (base64 stream).
3. Đo:
   - final latency (từ stop speech → receive final)
   - CPU % (dùng pidusage)
4. Assert:
   - p95 latency &lt;2 s
   - CPU &lt;70 %
5. Xuất report json → lưu artifact CI

## Test accept
- assert pass, CI xanh