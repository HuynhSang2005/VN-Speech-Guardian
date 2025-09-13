# P04 – ASR Offline (FastAPI)

Mục tiêu: download whisper-base, VAD, trả partial/final

## Step nhỏ
1. Tải whisper-base về apps/asr-fastapi/models/whisper-base (dùng huggingface-cli).
2. Viết VAD silero cắt speech 0.8-2 s.
3. faster-whisper base.int8 → partial/final + word_timestamps.
4. Router WebSocket /ws – nhận bytes PCM 16kHz.
5. Emit:
   {type:"partial", text, startMs, endMs}
   {type:"final", text, segments[]}
6. pytest:
   - input file tests/data/vi_2s.wav → assert text == "xin chào"

## Test accept
- pytest pass, CI xanh