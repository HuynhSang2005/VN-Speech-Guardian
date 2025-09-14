
## 1. Faster Whisper (Offline, Python)

- Faster Whisper là thư viện tối ưu phiên bản Whisper có thể chạy offline nhanh với Python.
- Cài đặt Faster Whisper qua pip:

```bash
pip install faster-whisper
```

- Ví dụ tải và sử dụng model offline Python:

```python
from faster_whisper import WhisperModel

model_size = "small"  # cân nhắc small để nhanh và nhẹ
```bash
pip install faster-whisper
```

- Ví dụ tải và sử dụng model offline Python:
```python
from faster_whisper import WhisperModel

model_size = "small"  # cân nhắc small để nhanh và nhẹ

```python
from faster_whisper import WhisperModel

model_size = "small"  # cân nhắc small để nhanh và nhẹ
model = WhisperModel(model_size, device="cpu")  # hoặc 'cuda' nếu có GPU

result = model.transcribe("file_audio.wav")
print(result[0])
```

- Link dự án Faster Whisper GitHub tải model:  
https://github.com/openai/whisper  
https://github.com/SYSTRAN/faster-whisper

Model sẽ được tự động tải khi sử dụng hoặc có thể tải thủ công từ link trong repo.

***

## 2. PhoBERT (Offline, Python)

- Tải model PhoBERT-base offline từ Hugging Face:

```bash
pip install transformers
pip install torch
```

- Code tải và load PhoBERT offline:

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification

tokenizer = AutoTokenizer.from_pretrained("vinai/phobert-base", local_files_only=True)
model = AutoModelForSequenceClassification.from_pretrained("vinai/phobert-base", local_files_only=True)
```

- Nếu muốn tải model offline thủ công để dùng local_files_only=True:

Tải model repo: https://huggingface.co/vinai/phobert-base

Dùng `git lfs` để tải về đầy đủ dữ liệu hoặc download qua huggingface-cli.

***

## 3. Dataset ViHSD (Vietnamese Hate Speech Detection)

- Dataset ViHSD có sẵn public trên GitHub:

Link tải dataset:  
https://github.com/sonlam1102/vihsd

- Có thể clone hoặc tải zip về:

```bash
git clone https://github.com/sonlam1102/vihsd.git
```

- Dataset chứa dữ liệu offline, phù hợp dùng cho fine-tune PhoBERT hoặc các bài toán NLP khác.

***

### Tóm lại
| Thành phần     | Cách tải/offline sử dụng                                                         |
|----------------|---------------------------------------------------------------------------------|
| Faster Whisper | `pip install faster-whisper`, dùng API tự động tải model hoặc tải thủ công GitHub repo |
| PhoBERT        | Tải model từ Hugging Face (vinai/phobert-base), dùng transformers Python offline |
| ViHSD dataset  | Clone/fork hoặc tải từ https://github.com/sonlam1102/vihsd                       |

Nếu cần hỗ trợ chi tiết từng bước triển khai hoặc tải model, dataset offline, có thể yêu cầu thêm. Các link và cách sử dụng đã được tóm tắt và chuẩn bị cho tải offline và chạy Python.Để download và sử dụng offline Faster Whisper, PhoBERT và dataset ViHSD, dưới đây là hướng dẫn cùng link tải cần thiết.[1][2][3]

***

## 1. Faster Whisper (offline, Python)
- Cài thư viện Faster Whisper qua pip:
```bash
pip install faster-whisper
---
applyTo:
	- "apps/ai-worker/**/*"
	- "apps/ai-worker/**"
---

---
applyTo:
	- "apps/ai-worker/**/*"
	- "apps/ai-worker/**"
---

# AI Service Instructions (Faster-Whisper + PhoBERT + Dataset)

Mục đích: hướng dẫn triển khai offline các thành phần chính cho AI service trong `apps/ai-worker` — Faster Whisper (ASR), PhoBERT (moderation/classification) và dataset ViHSD. Tài liệu này tập trung vào các bước cài đặt, cấu hình offline, gợi ý model size, tối ưu CPU và troubleshooting.

Lưu ý ngôn ngữ: các comment/ghi chú nội bộ dùng tiếng Việt không dau theo quy uoc repo.

## Tổng quan nhanh
- ASR: faster-whisper (Python) để chạy Whisper offline trên CPU. Khuyến nghị model `small` hoặc `medium` cho cân bằng độ chính xác / latency.
- Moderation/NLP: PhoBERT (transformers) cho tiếng Việt. Dùng model `vinai/phobert-base` hoặc các checkpoint đã fine-tune.
- Dataset: ViHSD (Vietnamese Hate Speech Dataset) để fine-tune hoặc đánh giá mô hình.

## Prerequisites
- Python 3.10+ (3.11 khuyến nghị khi dùng latest libraries)
- Git (với git-lfs nếu tải model từ HF bằng git)
- Kết nối internet 1 lần để tải model (hoặc tải thủ công rồi copy vào /models)
- Khuyến nghị tạo virtualenv/venv

## 1) Faster-Whisper (ASR)

Contract (ngắn):
- Input: file WAV hoặc stream PCM 16kHz mono
- Output: list chữ (segments) + text final
- Error modes: model file missing, OOM, permission

Cài đặt nhanh (local venv):

```bash
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1   # PowerShell on Windows
pip install --upgrade pip
pip install faster-whisper onnxruntime
```

Load model (ví dụ):

```python
from faster_whisper import WhisperModel

# model_size: tiny, base, small, medium, large
model = WhisperModel("small", device="cpu")
segments, info = model.transcribe("./data/file_audio.wav")
print(segments)
```

Tips/Tối ưu:
- Dùng `small` cho MVP; `tiny` nếu cần latency cực thấp.
- Nếu có khả năng chạy trên GPU, set `device='cuda'`.
- Giữ beam_size nhỏ (1-3) để giảm latency.
- Nếu muốn tải model thủ công: clone repo hoặc download checkpoint và đặt trong `/apps/ai-worker/models/whisper-small/`.

Links:
- https://github.com/SYSTRAN/faster-whisper
- https://github.com/openai/whisper

## 2) PhoBERT (Moderation / Keyword Detection)

Contract (ngắn):
- Input: Vietnamese text (string)
- Output: label/confidence hoặc embedding
- Error modes: tokenizer mismatch, model not found, sequence too long

Cài đặt nhanh:

```bash
pip install transformers torch sentencepiece
```

Ví dụ load model (offline-ready):

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# Nếu đã tải model vào local và dùng local_files_only=True
tokenizer = AutoTokenizer.from_pretrained("vinai/phobert-base", local_files_only=True)
model = AutoModelForSequenceClassification.from_pretrained("vinai/phobert-base", local_files_only=True)

# Inference sample
inputs = tokenizer("Xin chao, hom nay the nao?", return_tensors="pt")
outputs = model(**inputs)
```

Tips:
- Để giảm kích thước/latency: export model sang ONNX rồi dùng onnxruntime.
- Nếu fine-tune, lưu checkpoint local và sử dụng `local_files_only=True` để đảm bảo offline.
- Chuẩn hóa text (NFC, loại Unicode non-standard) trước khi tokenize.

Links:
- https://huggingface.co/vinai/phobert-base
- Hướng dẫn ONNX export: https://huggingface.co/docs/transformers/serialization

## 3) Dataset ViHSD
- Dataset trên Hugging Face: https://huggingface.co/datasets/visolex/ViHSD

Clone nhanh:

```bash
git clone https://huggingface.co/datasets/visolex/ViHSD apps/ai-worker/data/vihsd
```

Sử dụng dataset để fine-tune PhoBERT hoặc tạo bộ từ khóa xấu.

## Offline model management (recommended layout)

/apps/ai-worker/models/
- whisper-small/  # faster-whisper checkpoint files
- phobert-base/   # HF model files (config, pytorch_model.bin, tokenizer files)

Luôn kiểm tra quyền file và owner nếu server chạy dưới user khác.

## Troubleshooting & FAQ

1) Model not found / local_files_only error
- Kiểm tra path đúng, hoặc tải model bằng huggingface-cli: `huggingface-cli repo clone <name>` hoặc dùng `git lfs`.

2) OOM on CPU
- Dùng smaller model (`tiny`/`base`), hoặc dùng quantized model/onnx int8.

3) Slow transcription
- Giảm beam_size, đổi model_size, kiểm tra I/O (decompressing audio), dùng batch processing.

4) Windows-specific
- PowerShell: activate venv via `\\.venv\\Scripts\\Activate.ps1`.
- Nếu gặp permissions, chạy PowerShell as Admin để cho phép script execution or set-executionpolicy.

## Testing (quick checks)

- Test ASR fast smoke test: chạy script nhỏ `tests/smoke_asr.py` (tạo file test nếu cần) để transcribe sample wav.
- Test PhoBERT: chạy inference script `tests/smoke_phobert.py`.


---
