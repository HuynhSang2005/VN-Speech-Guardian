# Hướng dẫn train PhoBERT cho Moderation (tiếng Việt)

Tài liệu này dành cho dev Việt. Mục tiêu: fine-tune PhoBERT-base thành bộ phân loại 3 lớp safe|warn|block từ CSV có sẵn, sau đó dùng ngay trong FastAPI AI Worker.

---

## 1) Kiến trúc, tech stack và lý do chọn

- Mô hình: PhoBERT-base (Roberta-base cho tiếng Việt). Ưu điểm: strong baseline, dễ fine-tune.
- Thư viện chính:
  - transformers (HuggingFace): model, tokenizer, Trainer API.
  - datasets (HuggingFace): load CSV, split, map, stratify.
  - scikit-learn: metric F1/precision/recall/accuracy.
  - torch (CPU): huấn luyện, có class-weight hỗ trợ lớp hiếm.
- Kỹ thuật dùng trong file train:
  - Dynamic padding (DataCollatorWithPadding) để giảm padding thừa → nhanh hơn trên CPU.
  - Stratified split theo nhãn số để train/test có phân phối lớp tương tự.
  - Class-weighted loss (CrossEntropy) tự tính từ phân phối lớp train → tăng recall lớp warn/block.
  - Tùy chọn Focal Loss (`--focal-loss 1 --focal-gamma 2.0`) để đẩy mạnh lớp thiểu số.
  - Early stopping, warmup, scheduler (linear/cosine), gradient clipping/accumulation.
  - group_by_length để gom batch theo độ dài gần nhau → ít padding → nhanh hơn.
  - CPU-friendly: tắt pin_memory, giảm số thread để không chiếm full CPU.

---

## 2) File sử dụng để train

- Script: `apps/ai-worker/tools/train_phobert.py`
- Dataset mặc định: `apps/ai-worker/app/datasets/viHSD.csv`
- Model out: `apps/ai-worker/app/models/bert-finetuned`
- Pretrained mặc định: `vinai/phobert-base`

Script xử lý:
- Chuẩn hóa cột CSV về `text,label` nếu là ViHSD (free_text,label_id) → map về nhãn safe|warn|block.
- Tạo thêm cột `label_id` để stratify (0,1,2 theo label_map).
- Tách train/test theo stratify_by_column (fallback nếu version datasets cũ).
- Tokenize bằng tokenizer PhoBERT, cắt theo `--text-max-len`.
- Xóa các cột text/label sau khi tokenize để DataCollator không pad string.
- Dùng Trainer + CustomTrainer (compute_loss) để áp trọng số lớp khi bật.

---

## 3) Cài môi trường nhanh

```powershell
# Windows PowerShell
cd apps/ai-worker
if (-not (Test-Path .\.venv\Scripts\Activate.ps1)) { py -3 -m venv .venv }
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Nếu cần cài riêng deps train (đã có trong requirements.txt của ai-worker):
- transformers, datasets, scikit-learn, accelerate, evaluate

---

## 4) Chạy train nhanh (khuyến nghị CPU)

Ví dụ chạy nhanh để smoke-test (20% dữ liệu, 2 epoch, dynamic padding, class-weight):

```powershell
python ..\tools\train_phobert.py ^
  --dataset apps/ai-worker/app/datasets/viHSD.csv ^
  --outdir apps/ai-worker/app/models/bert-finetuned ^
  --pretrained vinai/phobert-base ^
  --epochs 2 ^
  --text-max-len 192 ^
  --batch-size 12 ^
  --subset-fraction 0.2 ^
  --freeze-prefix-layers 0 ^
  --encoding latin-1 ^
  --class-weighted-loss 1 ^
  --focal-loss 1 ^
  --focal-gamma 2.0 ^
  --group-by-length 1 ^
  --early-stopping-patience 1 ^
  --warmup-ratio 0.06 ^
  --scheduler-type linear ^
  --grad-accum-steps 1 ^
  --max-grad-norm 1.0
```

Gợi ý tối ưu:
- Nhanh hơn: giảm `--text-max-len` xuống 128, `--batch-size` xuống 8.
- Chất lượng hơn: tăng `--epochs` lên 3 (early stopping vẫn bật), có thể giảm `--lr` xuống 1e-5.

---

## 5) Giải thích tham số chính

- `--dataset` (CSV): đường dẫn CSV, cột `text,label`. Nếu theo ViHSD (free_text,label_id,type) script sẽ tự chuẩn hóa.
- `--outdir`: thư mục lưu checkpoint (tokenizer + model) để ai-worker nạp.
- `--pretrained`: tên hoặc thư mục model base (mặc định `vinai/phobert-base`).
- `--epochs`: số epoch train. CPU khuyến nghị 2–3 với early stopping.
- `--text-max-len`: độ dài cắt token, 128–256 tùy cân bằng chất lượng/nhanh.
- `--batch-size`: kích thước batch. CPU 8–16 tùy RAM.
- `--subset-fraction`: lấy ngẫu nhiên 0–1 phần dữ liệu để train nhanh.
- `--freeze-prefix-layers`: số layer đầu để freeze (0 = không freeze, học tốt hơn cho lớp hiếm).
- `--encoding`: encoding của CSV (ViHSD có thể cần `latin-1`).
- `--class-weighted-loss` (0/1): bật trọng số lớp để cân bằng loss.
- `--group-by-length` (0/1): gom batch theo độ dài gần nhau.
- `--early-stopping-patience`: số epoch không cải thiện trước khi dừng sớm.
- `--warmup-ratio`: tỉ lệ warmup LR lúc đầu (ví dụ 0.06).
- `--scheduler-type`: `linear` hoặc `cosine`.
- `--grad-accum-steps`: tích lũy gradient để mô phỏng batch lớn.
- `--max-grad-norm`: clip gradient, mặc định 1.0.

Các thông số ngầm định khác trong script:
- metric_for_best_model: `eval_f1` (macro-F1), greater_is_better: true.
- Dynamic padding với DataCollatorWithPadding.
- remove_unused_columns=True để nhẹ I/O và memory.
- dataloader_pin_memory=False (CPU), set_num_threads để không chiếm hết CPU.

---

## 6) Kết quả và đánh giá

Cuối train script sẽ in:
- Phân phối lớp train/test, và class weights đang dùng.
- Metrics eval: accuracy, macro-F1, precision, recall.
- Checkpoint đã lưu: `apps/ai-worker/app/models/bert-finetuned`.

Bạn có thể sanity-check nhanh bằng tool:

```powershell
python .\apps\ai-worker\tools\sanity_check_phobert.py --dir apps/ai-worker/app/models/bert-finetuned
```

---

## 7) Dùng model trong AI Worker

- Cập nhật `.env` (đã setup sẵn trong repo):
  - `PHOBERT_CHECKPOINT_DIR=apps/ai-worker/app/models/bert-finetuned`
  - `AI_LOAD_MODELS=true`
- Khởi động server và gọi POST `/moderation` với header `x-api-key`.

Tùy chọn ONNX (CPU nhanh hơn):
- Cài deps: `pip install -r apps/ai-worker/requirements-onnx.txt`
- Export: `python apps/ai-worker/tools/export_onnx_phobert.py --src apps/ai-worker/app/models/bert-finetuned --dst apps/ai-worker/app/models/bert-finetuned-onnx --opset 17`
- Smoke test nhanh (tuỳ chọn): `python apps/ai-worker/tools/smoke_ort_infer.py`
- Dùng trong app (.env):
  - `PHOBERT_ONNX_DIR=apps/ai-worker/app/models/bert-finetuned-onnx`
  - `USE_ONNXRUNTIME=true`
  - `AI_LOAD_MODELS=true`

---

## 8) Mẹo nâng chất lượng

- Duy trì `--class-weighted-loss 1` để cứu lớp warn/block (thiểu số).
- Tăng epoch 2–3 + early stopping; giảm LR 1e-5 nếu thấy loss dao động.
- Xem xét tiền xử lý text đơn giản: lowercase, normalize space, loại bỏ ký tự lạ.
- Có thể thêm lựa chọn focal loss (đề xuất mở rộng) nếu muốn đẩy recall lớp hiếm.
- Khi inference: cân nhắc export ONNX + onnxruntime để giảm latency CPU.

---

## 9) Troubleshooting nhanh

- Lỗi padding string (too many dimensions 'str'): đảm bảo script đã remove cột text/label sau tokenize (đã làm).
- Lỗi UnicodeDecodeError: dùng `--encoding latin-1` cho ViHSD.
- Train chậm: giảm `--subset-fraction`, `--text-max-len`, `--batch-size`, bật `--group-by-length`.
- Macro-F1 thấp: tăng epoch, bật class-weight, kiểm tra phân phối lớp in ra.
