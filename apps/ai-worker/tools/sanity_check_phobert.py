import argparse
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import torch.nn.functional as F


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="apps/ai-worker/app/models/bert-finetuned", help="Checkpoint directory")
    args = ap.parse_args()

    tok = AutoTokenizer.from_pretrained(args.dir)
    mdl = AutoModelForSequenceClassification.from_pretrained(args.dir).eval()
    id2label = mdl.config.id2label

    sents = [
        "Xin chào, chúc bạn một ngày tốt lành.",
        "Đồ khốn nạn, câm mồm lại!",
        "Bạn có thể giúp tôi việc này không?",
    ]
    enc = tok(sents, padding=True, truncation=True, max_length=256, return_tensors="pt")
    with torch.no_grad():
        logits = mdl(**enc).logits
        probs = F.softmax(logits, dim=-1).tolist()
    for s, pv in zip(sents, probs):
        idx = max(range(len(pv)), key=lambda i: pv[i])
        print(f"{s} => {id2label.get(idx, str(idx))} ({pv[idx]:.3f})")


if __name__ == "__main__":
    main()
