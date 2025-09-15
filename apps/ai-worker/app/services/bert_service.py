from typing import Any
import torch
import torch.nn.functional as F
from ..core.config import cfg


def _heuristic(batch: list[str]):
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


@torch.inference_mode()
def predict(batch: list[str], phobert: Any | None = None):
    # Nếu chưa nạp model, trả heuristic để nhanh
    if not phobert:
        return _heuristic(batch)
    try:  # pragma: no cover - khó test đầy đủ với model thật
        tok = phobert["tokenizer"]
        mdl = phobert["model"].eval()
        enc = tok(batch, padding=True, truncation=True, max_length=cfg.TEXT_MAX_LEN, return_tensors="pt")
        logits = mdl(**enc).logits
        probs = F.softmax(logits, dim=-1).cpu().tolist()
        id2label = {v: k for k, v in cfg.LABEL_MAP.items()}
        out = []
        for p in probs:
            idx = int(max(range(len(p)), key=lambda i: p[i]))
            out.append({"label": id2label.get(idx, str(idx)), "score": float(p[idx])})
        return out
    except Exception:  # pragma: no cover
        return _heuristic(batch)
