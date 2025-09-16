---
language: vi
tags:
- hate-speech-detection
- vietnamese
- phobert
license: apache-2.0
datasets:
- VN-HSD
metrics:
- accuracy
- f1
model-index:
- name: phobert-hsd
  results:
  - task:
      type: text-classification
      name: Hate Speech Detection
    dataset:
      name: VN-HSD
      type: custom
    metrics:
    - name: Accuracy
      type: accuracy
      value: <INSERT_ACCURACY>
    - name: F1 Score
      type: f1
      value: <INSERT_F1_SCORE>
base_model:
- vinai/phobert-base
pipeline_tag: text-classification
---

# PhoBERT‑HSD: Hate Speech Detection for Vietnamese Text

Fine‑tuned from [`vinai/phobert-base`](https://huggingface.co/vinai/phobert-base) on the **VN‑HSD** dataset.

## Model Details

* **Base Model**: [`vinai/phobert-base`](https://huggingface.co/vinai/phobert-base)
* **Dataset**: VN‑HSD (ViSoLex‑HSD unified hate speech corpus)
* **Fine‑tuning**: HuggingFace Transformers

### Hyperparameters

* Batch size: `32`
* Learning rate: `5e-5`
* Epochs: `100`
* Max sequence length: `256`

## Results

* **Accuracy**: `<INSERT_ACCURACY>`
* **F1 Score**: `<INSERT_F1_SCORE>`

## Usage

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification

tokenizer = AutoTokenizer.from_pretrained("visolex/phobert-hsd")
model = AutoModelForSequenceClassification.from_pretrained("visolex/phobert-hsd")

text = "Đừng nói những lời thô tục như vậy!"
inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=256)
pred = model(**inputs).logits.argmax(dim=-1).item()
print(f"Label: {['CLEAN','OFFENSIVE','HATE'][pred]}")
```