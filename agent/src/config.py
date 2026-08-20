"""Env loading + validation, in one place (mirrors the backend's config module)."""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load agent/.env regardless of the current working directory.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required env var: {name} (set it in agent/.env)")
    return value


# The LiveKit worker reads LIVEKIT_URL / API_KEY / API_SECRET from the environment
# directly — assert them here so a missing key fails with a clear message.
for _k in ("LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"):
    _require(_k)

# Passed explicitly to the Gemini TTS plugin (avoids the GOOGLE_API_KEY gotcha).
GEMINI_API_KEY = _require("GEMINI_API_KEY")

# gemini-2.5-flash-preview-tts is verified working; swappable via env. All Gemini
# TTS models are "preview" and may expire — see the CLAUDE.md gotcha.
TTS_MODEL = os.environ.get("TTS_MODEL", "gemini-2.5-flash-preview-tts")
