"""
Handbook best practice: "Cache aggressively: store every result keyed by
area + date/time so you never pay twice for the same query."

File-based JSON cache — simple, good enough for a hackathon, survives
restarts (unlike an in-memory dict).
"""
import json
import os

import tempfile

# Serverless platforms (Vercel, etc.) only allow writes to /tmp — everything
# else in the deployed filesystem is read-only. Fall back to /tmp if the
# local .cache folder can't be created (e.g. we're running deployed, not
# on your own laptop).
CACHE_DIR = os.path.join(os.path.dirname(__file__), ".cache")
try:
    os.makedirs(CACHE_DIR, exist_ok=True)
except OSError:
    CACHE_DIR = os.path.join(tempfile.gettempdir(), "fortyguard_cache")
    os.makedirs(CACHE_DIR, exist_ok=True)


def _key_to_path(key: str) -> str:
    safe = key.replace("/", "_").replace(":", "_")
    return os.path.join(CACHE_DIR, f"{safe}.json")


def get(key: str):
    path = _key_to_path(key)
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return None


def set(key: str, value: dict):
    path = _key_to_path(key)
    with open(path, "w") as f:
        json.dump(value, f)


def make_key(city: str, date: str, time: str, endpoint: str) -> str:
    return f"{endpoint}:{city}:{date}:{time}"