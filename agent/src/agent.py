"""Phase 6 — agent v2: a real STT → LLM → TTS interview loop.

Pipeline: Groq Whisper (speech-to-text) → LLM (Groq or Gemini, swappable) →
Gemini TTS (speech), with Silero VAD + LiveKit turn detection deciding when the
candidate has finished speaking.
"""

import logging

from livekit.agents import Agent, AgentSession, JobContext, JobProcess, WorkerOptions, cli
from livekit.plugins import groq, silero

import config
import prompts
from context import extract_candidate_context

logger = logging.getLogger("interview-agent")


def prewarm(proc: JobProcess) -> None:
    """Load the VAD model once per worker process, not once per interview.

    Loading Silero takes long enough to be audible as a delay at the start of a
    call, so it happens here, before any job is assigned.
    """
    proc.userdata["vad"] = silero.VAD.load()


def _build_tts():
    """Provider chosen by config (see _build_llm for why there's no failover)."""
    if config.TTS_PROVIDER == "local":
        from local_tts import LocalSayTTS

        return LocalSayTTS(voice=config.LOCAL_TTS_VOICE)
    if config.TTS_PROVIDER == "gemini":
        from livekit.plugins.google.beta import GeminiTTS

        return GeminiTTS(
            api_key=config.GEMINI_API_KEY,
            model=config.GEMINI_TTS_MODEL,
            voice_name=config.GEMINI_TTS_VOICE,
        )
    return groq.TTS(
        api_key=config.GROQ_API_KEY,
        model=config.GROQ_TTS_MODEL,
        voice=config.GROQ_TTS_VOICE,
    )


def _build_llm():
    """Provider chosen by config, never at runtime.

    Deliberately no automatic failover: in a live voice call a failed request
    plus a retry means the candidate sits in silence, which is worse than
    failing loudly.
    """
    if config.LLM_PROVIDER == "gemini":
        from livekit.plugins import google

        return google.LLM(api_key=config.GEMINI_API_KEY, model=config.GEMINI_LLM_MODEL)
    return groq.LLM(api_key=config.GROQ_API_KEY, model=config.GROQ_LLM_MODEL)


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()
    logger.info("agent connected to room %s", ctx.room.name)

    participant = await ctx.wait_for_participant()

    # The backend embedded the candidate's details in the room token, so LiveKit
    # hands them back here. This is the agent's only source of candidate data —
    # it has no database access by design.
    candidate = extract_candidate_context(participant.metadata)
    logger.info(
        "participant %s joined; candidate=%s role=%s resume=%s",
        participant.identity,
        candidate.name or "unknown",
        candidate.role or "unknown",
        "yes" if candidate.has_resume else "no",
    )

    session = AgentSession(
        vad=ctx.proc.userdata["vad"],
        stt=groq.STT(api_key=config.GROQ_API_KEY, model=config.STT_MODEL),
        llm=_build_llm(),
        tts=_build_tts(),
    )

    await session.start(
        agent=Agent(instructions=prompts.build_instructions(candidate)), room=ctx.room
    )

    # Agent speaks first. Not interruptible: the candidate's open mic would
    # otherwise cut the introduction off before it's audible (see CLAUDE.md).
    # Interruptions are allowed for the rest of the conversation, which is what
    # makes the back-and-forth feel natural.
    await session.generate_reply(
        instructions=prompts.build_greeting_instruction(candidate),
        allow_interruptions=False,
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))
