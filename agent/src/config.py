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

GEMINI_API_KEY = _require("GEMINI_API_KEY")
GROQ_API_KEY = _require("GROQ_API_KEY")

# --- Backend writeback (Phase 8) ---------------------------------------------
# The agent has no database access; results go through the backend API, which
# authenticates this shared secret. Must match backend/.env exactly.
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:4000")
AGENT_SHARED_SECRET = _require("AGENT_SHARED_SECRET")

# --- Speech-to-text (Groq Whisper) -------------------------------------------
STT_MODEL = os.environ.get("STT_MODEL", "whisper-large-v3-turbo")

# --- LLM ----------------------------------------------------------------------
# Swappable by config, not hardcoded — lets us compare providers and keeps the
# agent working when one is down. Deliberately NO automatic runtime failover: a
# failed call plus a retry means the candidate sits in silence, which is worse
# than failing loudly.
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "groq")
# The Groq plugin's default (llama-3.3-70b-versatile) is decommissioned — always
# pass an explicit model.
GROQ_LLM_MODEL = os.environ.get("GROQ_LLM_MODEL", "openai/gpt-oss-120b")
GEMINI_LLM_MODEL = os.environ.get("GEMINI_LLM_MODEL", "gemini-flash-latest")

# --- Text-to-speech -----------------------------------------------------------
# Swappable like the LLM. Default Groq: Gemini's TTS free tier caps at 3 requests,
# which is unusable for a conversation (one TTS call per agent turn). Gemini TTS
# models are also all "preview" and expire — see the CLAUDE.md gotchas.
# "local" (macOS `say`, offline, always works) | "groq" (needs console terms
# acceptance) | "gemini" (free tier caps at 3 requests — unusable for a call).
TTS_PROVIDER = os.environ.get("TTS_PROVIDER", "local")
# Enhanced/Premium macOS voices sound markedly better than the default compact
# ones, but must be downloaded first (System Settings → Accessibility → Spoken
# Content → System Voice → Manage Voices). `say -v '?'` lists what's installed.
LOCAL_TTS_VOICE = os.environ.get("LOCAL_TTS_VOICE", "Sangeeta (Enhanced)")
# Requires one-time model-terms acceptance in the Groq console (same trap as the
# retired playai-tts).
GROQ_TTS_MODEL = os.environ.get("GROQ_TTS_MODEL", "canopylabs/orpheus-v1-english")
GROQ_TTS_VOICE = os.environ.get("GROQ_TTS_VOICE", "autumn")
GEMINI_TTS_MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-2.5-flash-preview-tts")
GEMINI_TTS_VOICE = os.environ.get("GEMINI_TTS_VOICE", "Kore")
