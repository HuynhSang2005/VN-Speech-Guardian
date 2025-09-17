# Contributing & Review Guidelines (AI Worker)

1) Branch & PR
- Tạo branch `feat/xxx` hoặc `fix/xxx` từ `main`.
- Viết PR description ngắn gọn: mục đích, thay đổi chính, test đã chạy.

2) Test & CI
- Chạy `pytest` trước khi push.
- Đảm bảo coverage không giảm dưới 90% cho module ai-worker.

3) Model artifacts
- KHÔNG commit file model lớn (safetensors/onnx/pt) trực tiếp trừ khi có LFS.
- Thêm hướng dẫn tải model vào `docs/FINETUNE_PHOBERT.md`.
