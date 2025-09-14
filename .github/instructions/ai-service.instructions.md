# ai-service.instructions.md 

**Mục tiêu:** Chuẩn hóa cách **huấn luyện offline** PhoBERT trên `dataset.csv`, sau đó **deploy suy luận** trong FastAPI. Whisper dùng thẳng, không cần huấn luyện.

---

## 1) Chuẩn dữ liệu `dataset.csv`

* Cột bắt buộc: `text`, `label`
* Nhãn dùng bộ ánh xạ: `{"safe":0,"warn":1,"block":2}`
* Ví dụ:

```csv
text,label
"Xin chào bạn",safe
"Nội dung dễ gây tổn thương",warn
"Rất tục tĩu",block
```

---

## 2) Huấn luyện PhoBERT (offline, 1 lệnh)

Tạo `train_phobert.py` ở thư mục tạm bất kỳ:

```python
import os, json, numpy as np
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from sklearn.metrics import f1_score, precision_score, recall_score, accuracy_score

DATASET="./apps/ai-service/data/dataset.csv"
OUTDIR="./apps/ai-service/models/phobert-mvp"
PRETRAINED="vinai/phobert-base"
TEXT_MAX_LEN=256
LABEL_MAP={"safe":0,"warn":1,"block":2}

def metrics(p):
  l, y = p
  y = np.argmax(l, axis=-1)
  return {
    "accuracy": float((y==p.label_ids).mean()),
    "f1": float(f1_score(p.label_ids, y, average="macro", zero_division=0)),
    "precision": float(precision_score(p.label_ids, y, average="macro", zero_division=0)),
    "recall": float(recall_score(p.label_ids, y, average="macro", zero_division=0)),
  }

def main():
  raw = load_dataset("csv", data_files={"train": DATASET})["train"].train_test_split(test_size=0.1, seed=42)
  tok = AutoTokenizer.from_pretrained(PRETRAINED, use_fast=True)

  def prep(e):
    t = tok(e["text"], max_length=TEXT_MAX_LEN, truncation=True, padding="max_length")
    t["labels"] = [LABEL_MAP[x] for x in e["label"]]
    return t

  train = raw["train"].map(prep, batched=True)
  valid = raw["test"].map(prep, batched=True)

  mdl = AutoModelForSequenceClassification.from_pretrained(PRETRAINED, num_labels=3, id2label={v:k for k,v in LABEL_MAP.items()}, label2id=LABEL_MAP)

  args = TrainingArguments(
    output_dir=OUTDIR, num_train_epochs=3, per_device_train_batch_size=16, per_device_eval_batch_size=16,
    learning_rate=2e-5, evaluation_strategy="epoch", save_strategy="epoch", load_best_model_at_end=True,
    metric_for_best_model="f1", logging_steps=50
  )
  tr = Trainer(model=mdl, args=args, train_dataset=train, eval_dataset=valid, tokenizer=tok, compute_metrics=metrics)
  tr.train()
  tr.save_model(OUTDIR); tok.save_pretrained(OUTDIR)

if __name__=="__main__": main()
```

Chạy:

```bash
pip install -U transformers datasets scikit-learn accelerate evaluate
python train_phobert.py
# Kết quả: models/phobert-mvp/ gồm config.json, tokenizer.*, pytorch_model.bin...
```

---

## 3) Copy checkpoint sang service

* Đảm bảo thư mục: `apps/ai-service/models/phobert-mvp/`
* Kiểm tra đọc được: khởi động FastAPI, gọi `POST /moderation`. Nếu thiếu checkpoint sẽ trả 503.

---

## 4) Whisper trong MVP

* Dùng `faster-whisper` với `ASR_MODEL_NAME=small` trên CPU.
* Mặc định `ASR_LANGUAGE=vi` để cố định tiếng Việt.
* Thử với file `.wav` 16 kHz mono để ổn định.

---

## 5) Kết nối với NestJS Gateway

* Thêm biến ở Gateway:

```
AI_SERVICE_BASE_URL=http://localhost:8001
AI_SERVICE_API_KEY=dev-secret
```

* Gọi:

```ts
await axios.post(`${AI}/asr`, form, { headers: { "x-api-key": KEY, ...form.getHeaders() }})
await axios.post(`${AI}/moderation`, { inputs }, { headers: { "x-api-key": KEY }})
```

* Mapping lỗi:

  * 401 → key sai.
  * 400 → định dạng file audio không hợp lệ.
  * 503 → PhoBERT chưa sẵn sàng.

---
