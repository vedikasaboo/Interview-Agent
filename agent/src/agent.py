"""Phase 6 — agent v2: a real STT → LLM → TTS interview loop.

Pipeline: Groq Whisper (speech-to-text) → LLM (Groq or Gemini, swappable) →
Gemini TTS (speech), with Silero VAD + LiveKit turn detection deciding when the
candidate has finished speaking.
"""

import logging

from livekit.agents import Agent, AgentSession, JobContext, JobProcess, WorkerOptions, cli
from livekit.agents.voice.events import CloseEvent, CloseReason
from livekit.plugins import groq, silero

import config
import prompts
from backend_client import submit_interview_result
from context import extract_candidate_context
from evaluation import evaluate_transcript
from transcript import TranscriptRecorder

# Rooms are named `interview-<interviewToken>` by the backend (Phase 4), which is
# how the agent recovers the token it needs to write results back.
ROOM_PREFIX = "interview-"

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


async def _score_and_save(room_name: str, recorder: TranscriptRecorder, candidate) -> None:
    """Score the recorded transcript and write it back to the backend.

    Runs after the interview ends. Failures are logged, never raised: the call is
    already over, so crashing the worker would help no one.
    """
    if not room_name.startswith(ROOM_PREFIX):
        logger.warning("room %s is not an interview room; skipping writeback", room_name)
        return
    interview_token = room_name[len(ROOM_PREFIX) :]

    transcript = recorder.text()
    if not transcript:
        logger.info("no transcript captured; nothing to save")
        return

    logger.info(
        "interview ended; evaluating transcript (%d turns, %d chars)",
        recorder.turns,
        len(transcript),
    )
    # The résumé goes in so the model can report which claims the conversation
    # substantiated — it must not influence the score itself (see the prompt).
    evaluation = await evaluate_transcript(transcript, candidate)
    if evaluation is None:
        logger.warning("evaluation produced no result; skipping writeback")
        return

    await submit_interview_result(interview_token, transcript, evaluation)


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

    # Record turns as they happen — reading session.history at shutdown loses them.
    recorder = TranscriptRecorder()
    recorder.attach(session)

    await session.start(
        agent=Agent(instructions=prompts.build_instructions(candidate)), room=ctx.room
    )

    # Score and persist once the room closes (candidate hung up). Registered
    # before the first turn so an early disconnect is still captured.
    async def on_shutdown() -> None:
        await _score_and_save(ctx.room.name, recorder, candidate)

    ctx.add_shutdown_callback(on_shutdown)

    # The session closes as soon as the candidate disconnects, but the job — and
    # therefore the writeback above — would otherwise wait for the room to close.
    # The room can't go empty while the agent is still sitting in it, so the
    # result would be stranded until the room was deleted. End the job here.
    @session.on("close")
    def _on_close(event: CloseEvent) -> None:
        if event.reason != CloseReason.JOB_SHUTDOWN:
            logger.info("session closed (%s); shutting down job to save result", event.reason)
            ctx.shutdown(reason="interview ended")

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
