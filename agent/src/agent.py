"""Phase 5 — agent v1: join the room, say one hardcoded line via TTS, leave.

No LLM, no STT. This exists purely to prove the voice plumbing works (the agent
can join the candidate's room and be heard) before any model is introduced.
"""

import logging

from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.plugins.google.beta import GeminiTTS

import config

logger = logging.getLogger("interview-agent")

GREETING = (
    "Hi, thanks for joining. This is the Screener Agent. "
    "This is a test of the interview system — if you can hear me clearly, the "
    "voice connection is working. That's all for now. Goodbye."
)


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()
    logger.info("agent connected to room %s", ctx.room.name)

    # Wait for the candidate so we're not speaking to an empty room.
    await ctx.wait_for_participant()
    logger.info("participant present; speaking greeting")

    session = AgentSession(tts=GeminiTTS(api_key=config.GEMINI_API_KEY, model=config.TTS_MODEL))
    await session.start(agent=Agent(instructions="You are a test interviewer."), room=ctx.room)
    # allow_interruptions=False: the candidate's live mic triggers VAD, which would
    # otherwise cut this one-shot greeting off before it's audible (Phase 5 has no
    # conversation to interrupt into).
    await session.say(GREETING, allow_interruptions=False).wait_for_playout()

    logger.info("greeting complete; closing session and leaving")
    await session.aclose()


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
