"""HTTP calls to the backend.

The agent never touches the database. This module is the single outbound channel
for persisting anything, authenticated with the shared secret.
"""

from __future__ import annotations

import logging

import aiohttp

import config
from evaluation import Evaluation

logger = logging.getLogger("interview-agent")

TIMEOUT = aiohttp.ClientTimeout(total=30)


async def submit_interview_result(
    interview_token: str, transcript: str, evaluation: Evaluation
) -> bool:
    """POST the scored interview to the backend. Returns True on success.

    The backend upserts on the candidate, so a retry can't create duplicates.
    """
    url = f"{config.BACKEND_URL}/api/interviews/{interview_token}/result"
    payload = {
        "transcript": transcript,
        "summary": evaluation.summary,
        "score": evaluation.score,
        "strengths": evaluation.strengths,
        "concerns": evaluation.concerns,
        "discrepancies": [
            {"claim": d.claim, "finding": d.finding, "status": d.status}
            for d in evaluation.discrepancies
        ],
    }

    try:
        async with aiohttp.ClientSession(timeout=TIMEOUT) as session:
            async with session.post(
                url,
                headers={"x-agent-secret": config.AGENT_SHARED_SECRET},
                json=payload,
            ) as response:
                if response.status in (200, 201):
                    logger.info("interview result saved (score=%s)", evaluation.score)
                    return True
                body = await response.text()
                logger.error("writeback failed (%s): %s", response.status, body[:300])
                return False
    except aiohttp.ClientError:
        # The interview already happened; a failed writeback must not crash the
        # worker. Logged loudly so the loss is visible.
        logger.exception("could not reach the backend to save the interview result")
        return False
