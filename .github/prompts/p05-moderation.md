# P05 – Moderation (FastAPI)

Mục tiêu: download PhoBERT-ViHSD, sliding-window, emit detection

## Step nhỏ
1. Download phobert-viHSD vào models/phobert-viHSD.
2. Class Moderation – window 2 s, step 0.5 s, dedupe hash, hysteresis.
3. Nhãn: CLEAN | OFFENSIVE | HATE; severity: mild ≥0.5, moderate ≥0.7, severe ≥0.85.
4. Emit: {type:"detection", label, score, startMs, endMs, snippet, severity}.
5. pytest:
   - input "đồ ngốc" → label OFFENSIVE, score ≥0.8
   - 5 window liên tiếp toxic → 1 detection duy nhất

## Test accept
- pytest unit & integration pass