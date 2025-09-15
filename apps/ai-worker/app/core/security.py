from fastapi import Header, HTTPException
from .config import cfg


def verify_api_key(x_api_key: str | None = Header(default=None)):
    if x_api_key != cfg.API_KEY:
        raise HTTPException(status_code=401, detail="invalid api key")
    return True
