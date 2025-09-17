"""Audio and PCM helpers used by ASR pipeline.

Small helpers to convert PCM16LE bytes -> numpy float32, validate length, and resample placeholder.
"""
from __future__ import annotations

import numpy as np
from typing import Tuple


def validate_pcm16le(data: bytes) -> bool:
    """Validate that data length is multiple of 2 (int16 samples)."""
    return len(data) % 2 == 0


def pcm16le_bytes_to_float32(data: bytes) -> Tuple[np.ndarray, int]:
    """Convert PCM16LE bytes to float32 numpy array in range [-1,1].

    Returns (samples_float32, sample_count)
    """
    arr = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
    return arr, arr.shape[0]


def pcm16le_bytes_to_int16(data: bytes) -> np.ndarray:
    """Return numpy int16 array from PCM16LE bytes."""
    return np.frombuffer(data, dtype=np.int16)
