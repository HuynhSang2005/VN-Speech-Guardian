# P06 – React Live Page

Mục tiêu: microphone + socket.io + highlight toxic

## Step nhỏ
1. Trang LivePage – button Start/Stop mic.
2. Hook useSocket – connect /ws, gửi audio 200 ms chunk (base64).
3. Hiện text real-time, từ có isToxic=true → màu đỏ đậm.
4. Vitest unit: test hook parse message.
5. Playwright e2e:
   - bật trang, click Start, nói "đồ ngốc" → chờ từ "ngốc" màu đỏ → screenshot

## Test accept
- e2e pass, CI xanh