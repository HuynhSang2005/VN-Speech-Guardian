"""
Fine-tune PhoBERT for moderation (safe|warn|block) on CSV dataset.
- Input CSV columns: text,label with label in {safe,warn,block}
- Uses transformers Trainer for simplicity.
- Outputs a folder with tokenizer & model that ai-worker can load.

Research refs:
- HF Trainer docs: https://huggingface.co/docs/transformers/main_classes/trainer
- Dynamic padding via DataCollatorWithPadding improves CPU throughput: https://huggingface.co/docs/transformers/pad_truncation
- Freezing early transformer layers reduces compute on CPU: https://huggingface.co/docs/transformers/model_doc/roberta
"""
import os, json, argparse
from dataclasses import dataclass, field
from typing import Dict, Optional, List, Any, Tuple

import numpy as np
from datasets import load_dataset, Dataset, DatasetDict
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments,
)
from transformers import DataCollatorWithPadding, SchedulerType
from transformers.trainer_utils import IntervalStrategy
from sklearn.metrics import f1_score, precision_score, recall_score, accuracy_score
import torch
import torch.nn.functional as F
from transformers import EarlyStoppingCallback
try:
    # Available in many transformers versions
    from transformers import EvalPrediction  # type: ignore
except Exception:  # pragma: no cover
    EvalPrediction = Any  # type: ignore


@dataclass
class TrainCfg:
    data_csv: str = os.getenv("DATASET", "apps/ai-worker/app/datasets/viHSD.csv")
    out_dir: str = os.getenv("OUTDIR", "apps/ai-worker/app/models/bert-finetuned")
    pretrained: str = os.getenv("PRETRAINED", "vinai/phobert-base")
    text_max_len: int = int(os.getenv("TEXT_MAX_LEN", "256"))
    label_map: Dict[str, int] = field(default_factory=lambda: json.loads(os.getenv("LABEL_MAP", '{"safe":0,"warn":1,"block":2}')))
    epochs: int = int(os.getenv("EPOCHS", "3"))
    lr: float = float(os.getenv("LR", "2e-5"))
    batch_size: int = int(os.getenv("BS", "16"))
    train_samples: Optional[int] = int(os.getenv("TRAIN_SAMPLES", "800")) if os.getenv("TRAIN_SAMPLES") else None
    eval_samples: Optional[int] = int(os.getenv("EVAL_SAMPLES", "200")) if os.getenv("EVAL_SAMPLES") else None
    subset_fraction: Optional[float] = float(os.getenv("SUBSET_FRACTION", "0.5")) if os.getenv("SUBSET_FRACTION") else None
    freeze_prefix_layers: int = int(os.getenv("FREEZE_PREFIX_LAYERS", "0"))  # e.g., 4 to freeze early layers
    encoding: str = os.getenv("CSV_ENCODING", "utf-8")
    # Quality knobs
    early_stopping_patience: int = int(os.getenv("EARLY_STOPPING_PATIENCE", "2"))
    warmup_ratio: float = float(os.getenv("WARMUP_RATIO", "0.06"))
    scheduler_type: str = os.getenv("SCHEDULER_TYPE", "linear")  # linear|cosine
    grad_accum_steps: int = int(os.getenv("GRAD_ACCUM_STEPS", "1"))
    max_grad_norm: float = float(os.getenv("MAX_GRAD_NORM", "1.0"))
    group_by_length: bool = os.getenv("GROUP_BY_LENGTH", "true").lower() in ("1", "true", "yes")
    class_weighted_loss: bool = os.getenv("CLASS_WEIGHTED_LOSS", "true").lower() in ("1", "true", "yes")
    # Focal loss optional
    focal_loss: bool = os.getenv("FOCAL_LOSS", "false").lower() in ("1", "true", "yes")
    focal_gamma: float = float(os.getenv("FOCAL_GAMMA", "2.0"))


cfg = TrainCfg()
try:  # tối ưu thread CPU – để lại 1 core cho hệ thống
    torch.set_num_threads(max(1, (os.cpu_count() or 2) - 1))
except Exception:
    pass


def compute_metrics(p: Any):
    # Hỗ trợ cả API cũ (tuple) và mới (EvalPrediction)
    try:
        if isinstance(p, tuple) or isinstance(p, list):
            logits, labels = p  # type: ignore[assignment]
        else:
            logits, labels = p.predictions, p.label_ids  # type: ignore[attr-defined]
    except Exception:
        # Fallback bất chấp – tránh vỡ train do version
        logits, labels = p[0], p[1]  # type: ignore[index]
    preds = np.argmax(logits, axis=-1)
    return {
        "accuracy": float((preds == labels).mean()),
        "f1": float(f1_score(labels, preds, average="macro", zero_division=0)),
        "precision": float(precision_score(labels, preds, average="macro", zero_division=0)),
        "recall": float(recall_score(labels, preds, average="macro", zero_division=0)),
    }


def main():
    # CLI overrides (safer than env on PowerShell)
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", type=str, default=cfg.data_csv)
    ap.add_argument("--outdir", type=str, default=cfg.out_dir)
    ap.add_argument("--pretrained", type=str, default=cfg.pretrained)
    ap.add_argument("--text-max-len", type=int, default=cfg.text_max_len)
    ap.add_argument("--epochs", type=int, default=cfg.epochs)
    ap.add_argument("--lr", type=float, default=cfg.lr)
    ap.add_argument("--batch-size", type=int, default=cfg.batch_size)
    ap.add_argument("--subset-fraction", type=float, default=cfg.subset_fraction if cfg.subset_fraction else 0.0)
    ap.add_argument("--freeze-prefix-layers", type=int, default=cfg.freeze_prefix_layers)
    ap.add_argument("--train-samples", type=int, default=cfg.train_samples if cfg.train_samples else 0)
    ap.add_argument("--eval-samples", type=int, default=cfg.eval_samples if cfg.eval_samples else 0)
    ap.add_argument("--encoding", type=str, default=cfg.encoding)
    ap.add_argument("--early-stopping-patience", type=int, default=cfg.early_stopping_patience)
    ap.add_argument("--warmup-ratio", type=float, default=cfg.warmup_ratio)
    ap.add_argument("--scheduler-type", type=str, default=cfg.scheduler_type)
    ap.add_argument("--grad-accum-steps", type=int, default=cfg.grad_accum_steps)
    ap.add_argument("--max-grad-norm", type=float, default=cfg.max_grad_norm)
    ap.add_argument("--group-by-length", type=int, default=1 if cfg.group_by_length else 0)
    ap.add_argument("--class-weighted-loss", type=int, default=1 if cfg.class_weighted_loss else 0)
    ap.add_argument("--focal-loss", type=int, default=1 if cfg.focal_loss else 0)
    ap.add_argument("--focal-gamma", type=float, default=cfg.focal_gamma)
    args = ap.parse_args()

    # Apply overrides
    cfg.data_csv = args.dataset
    cfg.out_dir = args.outdir
    cfg.pretrained = args.pretrained
    cfg.text_max_len = args.text_max_len
    cfg.epochs = args.epochs
    cfg.lr = args.lr
    cfg.batch_size = args.batch_size
    cfg.subset_fraction = args.subset_fraction if args.subset_fraction and args.subset_fraction > 0 else None
    cfg.freeze_prefix_layers = args.freeze_prefix_layers
    cfg.train_samples = args.train_samples if args.train_samples and args.train_samples > 0 else None
    cfg.eval_samples = args.eval_samples if args.eval_samples and args.eval_samples > 0 else None
    cfg.encoding = args.encoding
    cfg.early_stopping_patience = args.early_stopping_patience
    cfg.warmup_ratio = args.warmup_ratio
    cfg.scheduler_type = args.scheduler_type
    cfg.grad_accum_steps = args.grad_accum_steps
    cfg.max_grad_norm = args.max_grad_norm
    cfg.group_by_length = bool(args.group_by_length)
    cfg.class_weighted_loss = bool(args.class_weighted_loss)
    cfg.focal_loss = bool(args.focal_loss)
    cfg.focal_gamma = float(args.focal_gamma)
    raw_all: Dataset = load_dataset("csv", data_files={"train": cfg.data_csv}, encoding=cfg.encoding)["train"]  # type: ignore[index]
    # Normalize columns to {text,label}
    cols = set(list(getattr(raw_all, "column_names", [])))
    if {"free_text", "label_id"}.issubset(cols):
        # Map ViHSD numeric labels to strings safe|warn|block
        id2label = {0: "safe", 1: "warn", 2: "block"}
        # Optional: keep only type==train if available
        if "type" in cols:
            raw_all = raw_all.filter(lambda e: (e.get("type") or "").lower() == "train")

        # Filter invalid rows where label_id is missing or outside 0..2 and text empty
        raw_all = raw_all.filter(
            lambda e: e.get("free_text") is not None and isinstance(e.get("label_id"), (int, float, str))
        )

        def adapt(example):
            try:
                lid = int(example["label_id"]) if example["label_id"] is not None else 0
            except Exception:
                lid = 0
            return {"text": str(example["free_text"]), "label": id2label.get(lid if lid in (0, 1, 2) else 0, "safe")}
        raw_all = raw_all.map(adapt, remove_columns=list(cols))
    elif {"text", "label"}.issubset(cols):
        pass
    else:
        raise RuntimeError(f"Unsupported CSV columns: {cols}")

    # Optional: take a random subset fraction of the whole dataset first (for speed)
    if cfg.subset_fraction and 0.0 < cfg.subset_fraction < 1.0:
        tmp: DatasetDict = raw_all.train_test_split(train_size=cfg.subset_fraction, seed=42)  # type: ignore[assignment]
        raw_all = tmp["train"]

    # Tạo cột label số cho stratify
    def to_numeric_label(e):
        return {"label_id": int(cfg.label_map.get(e["label"], 0))}
    raw_all = raw_all.map(to_numeric_label)

    # Stratified split nếu datasets hỗ trợ; fallback nếu không
    try:
        raw: DatasetDict = raw_all.train_test_split(test_size=0.1, seed=42, stratify_by_column="label_id")
    except Exception:
        raw = raw_all.train_test_split(test_size=0.1, seed=42)
    if cfg.train_samples:
        raw["train"] = raw["train"].select(range(min(cfg.train_samples, raw["train"].num_rows)))
    if cfg.eval_samples:
        raw["test"] = raw["test"].select(range(min(cfg.eval_samples, raw["test"].num_rows)))

    local_only = os.path.isdir(cfg.pretrained)
    tok = AutoTokenizer.from_pretrained(cfg.pretrained, use_fast=True, local_files_only=local_only)

    def prep(e):
        # Dynamic padding (faster on CPU). We'll set collator to pad per-batch.
        t = tok(e["text"], max_length=cfg.text_max_len, truncation=True)
        t["labels"] = [cfg.label_map[x] for x in e["label"]]
        return t

    # Loại bỏ các cột gốc như 'text'/'label' để DataCollator không cố pad chuỗi → gây lỗi "too many dimensions 'str'"
    train = raw["train"].map(prep, batched=True, remove_columns=raw["train"].column_names)
    valid = raw["test"].map(prep, batched=True, remove_columns=raw["test"].column_names)

    id2label = {v: k for k, v in cfg.label_map.items()}
    mdl = AutoModelForSequenceClassification.from_pretrained(
        cfg.pretrained,
        num_labels=len(cfg.label_map),
        id2label=id2label,
        label2id=cfg.label_map,
        local_files_only=local_only,
    )

    # Optionally freeze early encoder layers to reduce CPU load
    try:
        if cfg.freeze_prefix_layers > 0 and hasattr(mdl, "roberta"):
            base = mdl.roberta
            # Freeze embeddings
            for p in base.embeddings.parameters():
                p.requires_grad = False
            # Freeze first N encoder layers
            for layer in list(base.encoder.layer)[: cfg.freeze_prefix_layers]:
                for p in layer.parameters():
                    p.requires_grad = False
    except Exception as _:
        pass

    # Thống kê phân phối lớp để in ra và tính trọng số
    def class_counts(dataset):
        labs = dataset["label_id"] if "label_id" in dataset.column_names else [cfg.label_map[y] for y in dataset["label"]]
        counts = {i: 0 for i in range(len(cfg.label_map))}
        for v in labs:
            counts[int(v)] = counts.get(int(v), 0) + 1
        return counts

    tr_counts = class_counts(raw["train"])
    te_counts = class_counts(raw["test"])
    print("Class distribution (train)", {id2label[k]: v for k, v in tr_counts.items()})
    print("Class distribution (test) ", {id2label[k]: v for k, v in te_counts.items()})

    # Trọng số lớp: nghịch đảo tần suất, chuẩn hóa để trung bình = 1.0
    class_weights_tensor = None
    if cfg.class_weighted_loss:
        freqs = np.array([max(tr_counts.get(i, 0), 1) for i in range(len(cfg.label_map))], dtype=np.float32)
        inv = 1.0 / freqs
        weights = inv * (len(inv) / inv.sum())
        class_weights_tensor = torch.tensor(weights, dtype=torch.float32)
        print("Class weights:", {id2label[i]: float(w) for i, w in enumerate(weights.tolist())})

    # Khởi tạo TrainingArguments – đảm bảo evaluation/save strategy đồng bộ để load_best_model_at_end hợp lệ
    try:
        args = TrainingArguments(
            output_dir=cfg.out_dir,
            num_train_epochs=cfg.epochs,
            per_device_train_batch_size=cfg.batch_size,
            per_device_eval_batch_size=cfg.batch_size,
            learning_rate=cfg.lr,
            save_total_limit=1,
            load_best_model_at_end=True,
            evaluation_strategy=IntervalStrategy.EPOCH,  # type: ignore[arg-type]
            save_strategy=IntervalStrategy.EPOCH,  # type: ignore[arg-type]
            metric_for_best_model="eval_f1",
            greater_is_better=True,
            logging_steps=100,
            report_to=[],  # type: ignore[arg-type]
            dataloader_num_workers=2,
            remove_unused_columns=True,
            seed=42,
            warmup_ratio=cfg.warmup_ratio,
            lr_scheduler_type=SchedulerType.LINEAR if cfg.scheduler_type == "linear" else SchedulerType.COSINE,  # type: ignore[arg-type]
            gradient_accumulation_steps=cfg.grad_accum_steps,
            max_grad_norm=cfg.max_grad_norm,
            group_by_length=cfg.group_by_length,
            dataloader_pin_memory=False,
        )
    except TypeError:
        # Fallback cho version cũ: tạo args tối thiểu, rồi setattr các trường nếu có
        args = TrainingArguments(
            output_dir=cfg.out_dir,
            num_train_epochs=cfg.epochs,
            per_device_train_batch_size=cfg.batch_size,
            per_device_eval_batch_size=cfg.batch_size,
            learning_rate=cfg.lr,
            save_total_limit=1,
            load_best_model_at_end=False,  # tạm tắt, sẽ bật lại sau khi set eval/save
            logging_steps=100,
            report_to=[],  # type: ignore[arg-type]
            dataloader_num_workers=2,
            remove_unused_columns=True,
            seed=42,
        )
        try:
            setattr(args, "evaluation_strategy", IntervalStrategy.EPOCH)  # type: ignore[attr-defined]
            setattr(args, "save_strategy", IntervalStrategy.EPOCH)  # type: ignore[attr-defined]
            # Một số phiên bản dùng alias eval_strategy
            try:
                setattr(args, "eval_strategy", IntervalStrategy.EPOCH)  # type: ignore[attr-defined]
            except Exception:
                pass
        except Exception:
            try:
                setattr(args, "evaluation_strategy", "epoch")  # type: ignore[attr-defined]
                setattr(args, "save_strategy", "epoch")  # type: ignore[attr-defined]
                try:
                    setattr(args, "eval_strategy", "epoch")  # type: ignore[attr-defined]
                except Exception:
                    pass
            except Exception:
                pass
        for k, v in [
            ("metric_for_best_model", "eval_f1"),
            ("greater_is_better", True),
            ("warmup_ratio", cfg.warmup_ratio),
            ("lr_scheduler_type", SchedulerType.LINEAR if cfg.scheduler_type == "linear" else SchedulerType.COSINE),
            ("gradient_accumulation_steps", cfg.grad_accum_steps),
            ("max_grad_norm", cfg.max_grad_norm),
            ("group_by_length", cfg.group_by_length),
            ("dataloader_pin_memory", False),
        ]:
            try:
                setattr(args, k, v)
            except Exception:
                pass
        # Bật lại load_best_model_at_end nếu có eval/save hợp lệ
        try:
            if getattr(args, "evaluation_strategy", None) in (IntervalStrategy.EPOCH, "epoch"):
                setattr(args, "load_best_model_at_end", True)
        except Exception:
            pass

    collator = DataCollatorWithPadding(tokenizer=tok)

    # Focal loss helper for multi-class
    def focal_loss(logits: torch.Tensor, targets: torch.Tensor, gamma: float = 2.0, weights: Optional[torch.Tensor] = None) -> torch.Tensor:
        # logits: [B, C], targets: [B]
        log_probs = torch.log_softmax(logits, dim=-1)  # [B, C]
        probs = torch.exp(log_probs)
        pt = probs.gather(1, targets.unsqueeze(1)).squeeze(1)  # [B]
        modulating = (1.0 - pt).clamp(min=1e-6) ** gamma
        ce = -log_probs.gather(1, targets.unsqueeze(1)).squeeze(1)  # standard CE per-sample
        loss = modulating * ce
        if weights is not None:
            w = weights.to(logits.device)
            loss = loss * w[targets]
        return loss.mean()

    # Custom Trainer để hỗ trợ class-weighted loss và focal loss
    class CustomTrainer(Trainer):
        def __init__(self, class_weights=None, **kwargs):
            super().__init__(**kwargs)
            self.class_weights = class_weights

        def compute_loss(self, model, inputs: Dict[str, torch.Tensor], return_outputs: bool = False, **kwargs):  # type: ignore[override]
            labels = inputs.pop("labels")
            outputs = model(**inputs)
            logits = outputs.logits
            if cfg.focal_loss:
                loss = focal_loss(logits, labels, gamma=cfg.focal_gamma, weights=self.class_weights)
            else:
                loss = F.cross_entropy(logits, labels, weight=self.class_weights.to(logits.device) if self.class_weights is not None else None)
            return (loss, outputs) if return_outputs else loss

    callbacks: List[Any] = []
    try:
        callbacks.append(EarlyStoppingCallback(early_stopping_patience=cfg.early_stopping_patience))
    except Exception:
        pass

    try:
        tr = CustomTrainer(
            model=mdl,
            args=args,
            train_dataset=train,
            eval_dataset=valid,
            tokenizer=tok,
            data_collator=collator,
            compute_metrics=compute_metrics,
            callbacks=callbacks,
            class_weights=class_weights_tensor,
        )
    except TypeError:
        tr = CustomTrainer(
            model=mdl,
            args=args,
            train_dataset=train,
            eval_dataset=valid,
            data_collator=collator,
            compute_metrics=compute_metrics,
            callbacks=callbacks,
            class_weights=class_weights_tensor,
        )
    tr.train()
    try:
        metrics = tr.evaluate()
        print({k: float(v) for k, v in metrics.items() if isinstance(v, (int, float))})
    except Exception:
        pass
    tr.save_model(cfg.out_dir)
    tok.save_pretrained(cfg.out_dir)

    print(f"Saved fine-tuned model to {cfg.out_dir}")


if __name__ == "__main__":
    main()
