# P07 – Dashboard Stats

Mục tiêu: 5 widget (overview, hourly, labels, top-words, sessions)

## Step nhỏ
1. NestJS stats service – query raw SQL (đã có index).
   - overview: sessions, minutes, toxic%
   - hourly: detections theo 24 h
   - labels: count group by label
   - top-words: extract từ detections, count, limit 10
2. React:
   - DashboardPage – grid 2 cột (md)
   - Recharts Line + Bar + table top words
   - React Query cache 5 phút
3. Vitest unit – test render chart có data
4. E2E – login → vào dashboard → thấy biểu đồ

## Test accept
- widgets hiện đúng số liệu, CI xanh