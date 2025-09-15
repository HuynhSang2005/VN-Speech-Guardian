import os, json


class Cfg:
    APP_HOST = os.getenv("APP_HOST", "0.0.0.0")
    APP_PORT = int(os.getenv("APP_PORT", "8001"))
    ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "*").split(",")
    API_KEY = os.getenv("GATEWAY_API_KEY", "dev-secret")
    ASR_NAME = os.getenv("ASR_MODEL_NAME", "small")
    ASR_DEVICE = os.getenv("ASR_DEVICE", "cpu")
    ASR_COMPUTE_TYPE = os.getenv("ASR_COMPUTE_TYPE", "int8")  # float32|int8
    ASR_LANG = os.getenv("ASR_LANGUAGE", "vi")
    ASR_BEAM = int(os.getenv("ASR_BEAM_SIZE", "5"))
    ASR_SAMPLE_RATE = int(os.getenv("ASR_SAMPLE_RATE", "16000"))
    PHOBERT_DIR = os.getenv("PHOBERT_CHECKPOINT_DIR", "./models-and-dataset/phobert-base")
    LABEL_MAP = json.loads(os.getenv("MOD_LABELS_JSON", '{"safe":0,"warn":1,"block":2}'))
    TEXT_MAX_LEN = int(os.getenv("TEXT_MAX_LEN", "256"))
    # Gate heavy model loading to keep tests fast
    AI_LOAD_MODELS = os.getenv("AI_LOAD_MODELS", "false").lower() in ("1", "true", "yes")


cfg = Cfg()
