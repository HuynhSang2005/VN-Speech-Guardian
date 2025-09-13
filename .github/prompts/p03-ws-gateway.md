# P03 – WebSocket Gateway (NestJS)

Mục tiêu: nhận audio chunk, forward FastAPI, emit kết quả về FE

## Step nhỏ
1. Tạo AudioGateway (socket.io) path /ws – guard JwtAuthGuard dùng query ?token=..
2. Validate chunk theo Zod WsAudioChunk (shared-protocol).
3. Forward binary → FastAPI (ws thư viện `ws`) qua `ws://localhost:8001/ws`.
4. Nhận từ FastAPI: partial/final/detection → emit về client.
5. Unit test:
   - mock FastAPI WS → trả fake partial → assert client nhận đúng
6. E2E test:
   - socket.io-client gửi 3 chunk → chờ final → assert DB có transcript

## Test accept
- CI xanh, coverage ≥80 %