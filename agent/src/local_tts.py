"""Local text-to-speech via the macOS `say` command.

Exists because every cloud TTS option on this project's free tiers has failed in
some way: Groq's playai-tts was decommissioned, Gemini TTS caps the free tier at
3 requests (unusable for a conversation), and Groq's orpheus is gated behind
console terms acceptance. This runs offline with no key, quota, or terms — so
the interview loop is never blocked on a provider.

Voice quality is dated. Swap TTS_PROVIDER to a cloud provider (or a local
neural model like Kokoro) when one is actually available.
"""

from __future__ import annotations

import asyncio
import os
import tempfile

from livekit.agents import (
    DEFAULT_API_CONNECT_OPTIONS,
    APIConnectionError,
    APIConnectOptions,
    tts,
    utils,
)

SAMPLE_RATE = 24000
NUM_CHANNELS = 1


class LocalSayTTS(tts.TTS):
    def __init__(self, *, voice: str = "Samantha", rate_wpm: int = 175) -> None:
        # streaming=False: `say` writes a whole file, so LiveKit wraps this in its
        # stream adapter and chunks sentences for us.
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=SAMPLE_RATE,
            num_channels=NUM_CHANNELS,
        )
        self._voice = voice
        self._rate_wpm = rate_wpm

    def synthesize(
        self, text: str, *, conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS
    ) -> _SayStream:
        return _SayStream(tts=self, input_text=text, conn_options=conn_options)


class _SayStream(tts.ChunkedStream):
    async def _run(self, output_emitter: tts.AudioEmitter) -> None:
        engine = self._tts
        assert isinstance(engine, LocalSayTTS)

        # `say` writes to a file rather than stdout, so synthesis goes through a
        # temp WAV that is always cleaned up.
        fd, path = tempfile.mkstemp(suffix=".wav")
        os.close(fd)
        try:
            proc = await asyncio.create_subprocess_exec(
                "say",
                "-v",
                engine._voice,
                "-r",
                str(engine._rate_wpm),
                "-o",
                path,
                "--data-format=LEI16@24000",
                self._input_text,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await proc.communicate()
            if proc.returncode != 0:
                raise APIConnectionError(f"`say` failed: {stderr.decode().strip()}")

            with open(path, "rb") as f:
                audio = f.read()

            output_emitter.initialize(
                request_id=utils.shortuuid(),
                sample_rate=SAMPLE_RATE,
                num_channels=NUM_CHANNELS,
                mime_type="audio/wav",
            )
            output_emitter.push(audio)
            output_emitter.flush()
        finally:
            if os.path.exists(path):
                os.remove(path)
