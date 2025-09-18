#!/usr/bin/env python3
"""
Lightweight perf smoke: stream N short audio chunks to /asr/stream and record latencies.
Usage: python infra/perf/smoke_stream.py --count 50 --host http://localhost:8001

Outputs a small report (p50, p95) and saves a CSV of timings.
"""
import argparse
import time
import wave
import struct
import requests
import statistics
import os
import csv


def make_silence_wav(path: str, seconds: float = 0.2, sr: int = 16000):
    n = int(seconds * sr)
    data = b"".join(struct.pack('<h', 0) for _ in range(n))
    with wave.open(path, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(data)


def stream_file(url: str, filepath: str, api_key: str, session_id: str):
    headers = {
        'x-api-key': api_key,
        'x-session-id': session_id,
        'Content-Type': 'application/octet-stream'
    }
    with open(filepath, 'rb') as f:
        data = f.read()
    t0 = time.time()
    r = requests.post(url, headers=headers, data=data, timeout=30)
    t1 = time.time()
    return r.status_code, t1 - t0, r.text[:1024]


def docker_stats_snapshot(container_name: str = 'vsg-ai-worker'):
    # Attempt to call docker stats via CLI if available
    try:
        import subprocess
        out = subprocess.check_output(['docker', 'stats', '--no-stream', '--format', '{{.Name}},{{.CPUPerc}},{{.MemUsage}}', container_name])
        return out.decode().strip()
    except Exception:
        return ''


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--count', type=int, default=20)
    parser.add_argument('--host', type=str, default='http://localhost:8001')
    parser.add_argument('--api-key', type=str, default='dev-secret')
    parser.add_argument('--out', type=str, default='infra/perf/timings.csv')
    args = parser.parse_args()

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    wav_path = 'infra/perf/silence.wav'
    make_silence_wav(wav_path, seconds=0.2)

    url = args.host.rstrip('/') + '/asr/stream'
    timings = []
    rows = []
    for i in range(args.count):
        sid = f'smoke-{int(time.time()*1000)}-{i}'
        status, elapsed, snippet = stream_file(url, wav_path, args.api_key, sid)
        stats = docker_stats_snapshot()
        rows.append({'i': i, 'status': status, 'elapsed': elapsed, 'snippet': snippet, 'docker_stats': stats})
        timings.append(elapsed)
        print(f'{i+1}/{args.count} -> status={status} elapsed={elapsed:.3f}s')

    if timings:
        p50 = statistics.quantiles(timings, n=100)[49]
        p95 = statistics.quantiles(timings, n=100)[94]
    else:
        p50 = p95 = None

    print('\nPerf summary:')
    print(f'count: {len(timings)}, p50: {p50:.3f}s, p95: {p95:.3f}s')

    with open(args.out, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=['i', 'status', 'elapsed', 'snippet', 'docker_stats'])
        writer.writeheader()
        for r in rows:
            writer.writerow(r)


if __name__ == '__main__':
    main()
