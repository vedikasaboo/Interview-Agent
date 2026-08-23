"""Transcript capture.

Records each conversation turn as it is committed, rather than reading
`session.history` once at shutdown. Reading history at teardown proved lossy —
a live interview came back with only the greeting and a fragment of the first
answer — because turns are not guaranteed to still be there once the session is
closing. Subscribing to `conversation_item_added` captures each turn at the
moment it happens, so nothing can be lost later.
"""

from __future__ import annotations

import logging

from livekit.agents import AgentSession
from livekit.agents.voice.events import ConversationItemAddedEvent

logger = logging.getLogger("interview-agent")

SPEAKERS = {"assistant": "Interviewer", "user": "Candidate"}


class TranscriptRecorder:
    def __init__(self) -> None:
        self._lines: list[str] = []

    def attach(self, session: AgentSession) -> None:
        """Start recording. Safe to call once per session, before it starts."""

        @session.on("conversation_item_added")
        def _on_item(event: ConversationItemAddedEvent) -> None:
            self._record(event)

    def _record(self, event: ConversationItemAddedEvent) -> None:
        item = event.item
        speaker = SPEAKERS.get(getattr(item, "role", ""), None)
        if speaker is None:
            return  # agent handoffs and system items are not part of the transcript

        # text_content joins multi-part content and skips non-text parts.
        text = (getattr(item, "text_content", None) or "").strip()
        if not text:
            return
        self._lines.append(f"{speaker}: {text}")

    def text(self) -> str:
        return "\n".join(self._lines)

    @property
    def turns(self) -> int:
        return len(self._lines)
