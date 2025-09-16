from typing import Any
import torch
import torch.nn.functional as F
from ..core.config import cfg
from pathlib import Path
import json


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
        tok = phobert.get("tokenizer") if isinstance(phobert, dict) else None
        if tok is None:
            return _heuristic(batch)

        # Resolve id2label preference: model.config -> explicit in dict -> config.json in dir -> fallback env map
        id2label_map: dict[int, str] | None = None
        # 1) If model present, try model.config.id2label
        if isinstance(phobert, dict) and phobert.get("model") is not None:
            try:
                raw = getattr(phobert["model"].config, "id2label", None)
                if isinstance(raw, dict) and raw:
                    # Normalize: keys may be strings; values might be strings or ints
                    tmp: dict[int, str] = {}
                    inv_env = {v: k for k, v in cfg.LABEL_MAP.items()}
                    for k, v in raw.items():
                        ik = int(k)
                        if isinstance(v, str):
                            tmp[ik] = v
                        else:
                            # e.g., {"0":0,...} → map via inverse env to names
                            tmp[ik] = inv_env.get(int(v), str(v))
                    id2label_map = tmp
            except Exception:
                pass
        # 2) If still None and tokenizer path has config.json, read id2label
        if id2label_map is None:
            try:
                # AutoTokenizer usually keeps the directory in name_or_path
                name_or_path = getattr(tok, "name_or_path", None)
                if name_or_path:
                    cfg_path = Path(str(name_or_path)) / "config.json"
                    if cfg_path.exists():
                        with cfg_path.open("r", encoding="utf-8") as f:
                            cfg_json = json.load(f)
                        raw = cfg_json.get("id2label")
                        if isinstance(raw, dict) and raw:
                            tmp: dict[int, str] = {}
                            inv_env = {v: k for k, v in cfg.LABEL_MAP.items()}
                            for k, v in raw.items():
                                ik = int(k)
                                if isinstance(v, str):
                                    tmp[ik] = v
                                else:
                                    tmp[ik] = inv_env.get(int(v), str(v))
                            id2label_map = tmp
            except Exception:
                pass
        # 3) Fallback to env inverse mapping
        if id2label_map is None:
            id2label_map = {v: k for k, v in cfg.LABEL_MAP.items()}

        # ONNXRuntime path
        if isinstance(phobert, dict) and phobert.get("onnx_session") is not None:
            session = phobert["onnx_session"]
            # Tokenize to numpy inputs expected by ONNX
            enc = tok(batch, padding=True, truncation=True, max_length=cfg.TEXT_MAX_LEN, return_tensors="np")
            ort_inputs = {k: v for k, v in enc.items() if k in ("input_ids", "attention_mask")}
            ort_outs = session.run(None, ort_inputs)
            logits = torch.tensor(ort_outs[0])
            probs = F.softmax(logits, dim=-1).cpu().tolist()
        else:
            # PyTorch HF path
            mdl = phobert["model"].eval()
            enc = tok(batch, padding=True, truncation=True, max_length=cfg.TEXT_MAX_LEN, return_tensors="pt")
            logits = mdl(**enc).logits
            probs = F.softmax(logits, dim=-1).cpu().tolist()
        out = []
        for p in probs:
            idx = int(max(range(len(p)), key=lambda i: p[i]))
            out.append({"label": id2label_map.get(idx, str(idx)), "score": float(p[idx])})
        return out
    except Exception:  # pragma: no cover
        return _heuristic(batch)
