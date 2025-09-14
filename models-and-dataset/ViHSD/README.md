---
task_categories:
- text-classification
language:
- vi
---
## Dataset Card for ViHSD

### 1. Dataset Summary

**ViHSD** (Vietnamese Hate Speech Detection) is a unified CSV‐based dataset for hate speech detection in Vietnamese social media texts. It consolidates train/dev/test splits into a single file and uses a `type` field to distinguish:

* **Train**: \~26K examples
* **Dev**: \~3.3K examples
* **Test**: \~3.3K examples

Each example is a short user comment labelled as one of:

* `HATE`
* `OFFENSIVE`
* `CLEAN`

This version is adapted from the original **sonlam1102/vihsd** dataset on Hugging Face (which you can load directly) and is packaged here for easier integration into the ViSoLex Toolkit.


### 2. Supported Tasks and Leaderboard

* **Primary Task**: Text classification – hate speech detection
* **Metric**: Accuracy, F1-score

*No public leaderboard yet; feel free to report your results in the ViSoLex repo!*


### 3. Languages

* Vietnamese

### 4. Dataset Structure

The unified CSV has the following columns:

| Column  | Type   | Description                                   |
| ------- | ------ | --------------------------------------------- |
| `text`  | string | The social media comment (Vietnamese).        |
| `label` | string | One of `HATE`, `OFFENSIVE`, or `CLEAN`.       |
| `type`  | string | Split indicator: `train`/`validation`/`test`. |

### 5. Usage

```python
from datasets import load_dataset

ds = load_dataset("visolex/ViHSD")

train_ds = ds.filter(lambda x: x["type"] == "train")
dev_ds   = ds.filter(lambda x: x["type"] == "dev")
test_ds  = ds.filter(lambda x: x["type"] == "test")

# Example
print(train_ds[0])
```

### 6. Dataset Creation

1. **Source**: Originally released as [`sonlam1102/vihsd`](https://huggingface.co/datasets/sonlam1102/vihsd) on Hugging Face.
2. **Original Paper**: Luu et al. (2021) – “A large‑scale dataset for hate speech detection on Vietnamese social media texts.”
3. **Adaptation**: Merged the three CSV splits into one file; added a `type` column for split identification.
4. **Toolkit Integration**: Packaged for direct use in the ViSoLex lexical normalization and social‑listening pipeline.


### 7. Licenses and Citation

#### License

Please check the original license on the source repository. If not specified, assume **CC BY 4.0**.

#### How to Cite

If you use **ViHSD** in your work, please cite:

```bibtex
@inproceedings{luu2021large,
  title     = {A large-scale dataset for hate speech detection on Vietnamese social media texts},
  author    = {Luu, Son T and Nguyen, Kiet Van and Nguyen, Ngan Luu-Thuy},
  booktitle = {Advances and Trends in Artificial Intelligence. Artificial Intelligence Practices: 34th International Conference on 
               Industrial, Engineering and Other Applications of Applied Intelligent Systems, IEA/AIE 2021, Kuala Lumpur, Malaysia, 
               July 26--29, 2021, Proceedings, Part I 34},
  pages     = {415--426},
  year      = {2021},
  organization = {Springer}
}
```

```bibtex
@misc{sonlam1102_vihsd,
  title        = {Vietnamese Hate Speech Detection Dataset (ViHSD)},
  author       = {{sonlam1102}},
  howpublished = {\url{https://huggingface.co/datasets/sonlam1102/vihsd}},
  year         = {2021}
}
```