from ..core.config import cfg


def predict(batch: list[str]):
    # Stub heuristic: chứa từ khóa nhạy cảm → block, có "cảnh báo" → warn, còn lại safe
    res = []
    for s in batch:
        sl = s.lower()
        if any(k in sl for k in ["đồ ngu", "chửi", "fuck", "dm", "cc"]):
            res.append({"label": "block", "score": 0.95})
        elif any(k in sl for k in ["cảnh báo", "warning"]):
            res.append({"label": "warn", "score": 0.8})
        else:
            res.append({"label": "safe", "score": 0.98})
    return res
