#!/usr/bin/env python3
"""
Concurrent perf smoke: simulate multiple concurrent sessions (1..N) each sending M short audio chunks to /asr/stream.
Usage: python infra/perf/smoke_stream_concurrent.py --max-concurrency 3 --per-session 10 --host http://localhost:8001

Outputs: prints p50/p95 per concurrency level and saves CSVs under infra/perf/results/
"""
import argparse
import asyncio
import time
import wave
import struct
import aiohttp
import os
import csv
import statistics
from typing import List


async def make_silence_bytes(seconds: float = 0.2, sr: int = 16000) -> bytes:
    n = int(seconds * sr)
    # 16-bit PCM little endian silence
    return b"".join(struct.pack('<h', 0) for _ in range(n))


async def stream_bytes(session: aiohttp.ClientSession, url: str, data: bytes, api_key: str, session_id: str):
    headers = {
        'x-api-key': api_key,
        'x-session-id': session_id,
        'Content-Type': 'application/octet-stream'
    }
    t0 = time.time()
    try:
        async with session.post(url, data=data, headers=headers, timeout=30) as resp:
            text = await resp.text()
            elapsed = time.time() - t0
            return resp.status, elapsed, text[:1024]
    except Exception as e:
        return None, None, str(e)


async def run_session(session_idx: int, per_session: int, url: str, api_key: str, data: bytes, results: List[dict]):
    async with aiohttp.ClientSession() as sess:
        for i in range(per_session):
            sid = f'smoke-c{session_idx}-{int(time.time()*1000)}-{i}'
            status, elapsed, snippet = await stream_bytes(sess, url, data, api_key, sid)
            results.append({'concurrency': session_idx, 'i': i, 'status': status, 'elapsed': elapsed, 'snippet': snippet})
            print(f'c{session_idx} {i+1}/{per_session} -> status={status} elapsed={elapsed}')


async def run_concurrency_level(concurrency: int, per_session: int, url: str, api_key: str, data: bytes, out_dir: str):
    results = []
    tasks = [run_session(idx+1, per_session, url, api_key, data, results) for idx in range(concurrency)]
    start = time.time()
    await asyncio.gather(*tasks)
    duration = time.time() - start

    # collect latencies
    latencies = [r['elapsed'] for r in results if r['elapsed'] is not None]
    if latencies:
        p50 = statistics.quantiles(latencies, n=100)[49]
        p95 = statistics.quantiles(latencies, n=100)[94]
    else:
        p50 = p95 = None

    print(f'\nConcurrency={concurrency}: total_requests={len(results)} duration={duration:.3f}s p50={p50} p95={p95}\n')

    # write CSV
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, f'concurrency_{concurrency}.csv')
    with open(out_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=['concurrency', 'i', 'status', 'elapsed', 'snippet'])
        writer.writeheader()
        for r in results:
            writer.writerow(r)

    return {'concurrency': concurrency, 'total': len(results), 'duration': duration, 'p50': p50, 'p95': p95}


async def main_async(args):
    data = await make_silence_bytes(seconds=args.seconds)
    url = args.host.rstrip('/') + '/asr/stream'
    out_dir = args.out
    summary = []
    for c in range(1, args.max_concurrency + 1):
        res = await run_concurrency_level(c, args.per_session, url, args.api_key, data, out_dir)
        summary.append(res)
        # small cooldown between levels
        await asyncio.sleep(0.5)

    # write summary
    summary_file = os.path.join(out_dir, 'summary.csv')
    with open(summary_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=['concurrency', 'total', 'duration', 'p50', 'p95'])
        writer.writeheader()
        for s in summary:
            writer.writerow(s)

    print('\nOverall summary:')
    for s in summary:
        print(f"c={s['concurrency']} total={s['total']} dur={s['duration']:.3f}s p50={s['p50']} p95={s['p95']}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--max-concurrency', type=int, default=3)
    parser.add_argument('--per-session', type=int, default=10)
    parser.add_argument('--seconds', type=float, default=0.2)
    parser.add_argument('--host', type=str, default='http://localhost:8001')
    parser.add_argument('--api-key', type=str, default='dev-secret')
    parser.add_argument('--out', type=str, default='infra/perf/results')
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)

    asyncio.run(main_async(args))


if __name__ == '__main__':
    main()
