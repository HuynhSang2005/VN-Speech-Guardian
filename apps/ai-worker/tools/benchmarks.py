import os, time
from statistics import mean
from fastapi.testclient import TestClient
from app.main import create_app

# Simple local benchmarks for ASR and Moderation.
# Run: python apps/ai-worker/tools/benchmarks.py

ASR_CHUNKS = [b"\x00\x01" * 8000, b"\x02\x03" * 8000]  # ~16KB each; adjust to ~0.5-1s at 16kHz PCM16LE
N_ROUNDS = int(os.getenv("BM_ROUNDS", "5"))


def bench_asr(client: TestClient) -> float:
    times = []
    for _ in range(N_ROUNDS):
        t0 = time.perf_counter()
        client.post(
            "/asr/stream",
            content=ASR_CHUNKS[0],
            headers={
                "Content-Type": "application/octet-stream",
                "x-session-id": "bm-asr",
                "x-api-key": os.getenv("GATEWAY_API_KEY", "dev-secret"),
            },
        )
        r = client.post(
            "/asr/stream",
            content=ASR_CHUNKS[1],
            headers={
                "Content-Type": "application/octet-stream",
                "x-session-id": "bm-asr",
                "x-final": "true",
                "x-api-key": os.getenv("GATEWAY_API_KEY", "dev-secret"),
            },
        )
        t1 = time.perf_counter()
        assert r.status_code == 200
        times.append((t1 - t0) * 1000.0)
    return mean(times)


def bench_moderation(client: TestClient) -> float:
    times = []
    payload = {"inputs": [
        "Xin chào bạn",
        "Mày đồ ngu",
        "Câu này cảnh báo",
        "Hôm nay trời đẹp",
    ]}
    for _ in range(N_ROUNDS):
        t0 = time.perf_counter()
        r = client.post(
            "/moderation",
            json=payload,
            headers={"x-api-key": os.getenv("GATEWAY_API_KEY", "dev-secret")},
        )
        t1 = time.perf_counter()
        assert r.status_code == 200
        times.append((t1 - t0) * 1000.0)
    return mean(times)


def main():
    os.environ.setdefault("GATEWAY_API_KEY", "dev-secret")
    os.environ.setdefault("ASR_MIN_INTERVAL_MS", "0")
    app = create_app()
    client = TestClient(app)
    asr_ms = bench_asr(client)
    mod_ms = bench_moderation(client)
    print(f"ASR (2 chunks) avg: {asr_ms:.2f} ms over {N_ROUNDS} rounds")
    print(f"Moderation avg: {mod_ms:.2f} ms over {N_ROUNDS} rounds")


if __name__ == "__main__":
    main()
