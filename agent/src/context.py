"""Candidate context extraction and normalisation.

The backend embeds candidate details as metadata when it mints the LiveKit room
token (Phase 4), so LiveKit hands it back to us as the participant's metadata.
The agent never queries the database — this is the only inbound channel.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("interview-agent")

# Keep the prompt focused and bounded — a résumé with 40 skills would drown the
# instructions and cost latency on every turn.
MAX_SKILLS = 20
MAX_ENTRIES = 4


@dataclass
class CandidateContext:
    """What the interviewer knows about this candidate before speaking."""

    name: str | None = None
    role: str | None = None
    campaign_title: str | None = None
    skills: list[str] = field(default_factory=list)
    experience: list[str] = field(default_factory=list)
    projects: list[str] = field(default_factory=list)
    education: list[str] = field(default_factory=list)
    research: list[str] = field(default_factory=list)

    @property
    def has_resume(self) -> bool:
        return bool(self.skills or self.experience or self.projects or self.research)

    @property
    def first_name(self) -> str | None:
        return self.name.split()[0] if self.name else None


def _clean(value: Any) -> str | None:
    """Normalise a metadata value to a non-empty string, or None."""
    if not isinstance(value, str):
        return None
    stripped = value.strip()
    return stripped or None


def _entries(items: Any, formatter) -> list[str]:
    """Render a résumé list into short human-readable lines, skipping junk."""
    if not isinstance(items, list):
        return []
    out: list[str] = []
    for item in items[:MAX_ENTRIES]:
        if not isinstance(item, dict):
            continue
        line = formatter(item)
        if line:
            out.append(line)
    return out


def extract_candidate_context(metadata: str | None) -> CandidateContext:
    """Parse participant metadata into a CandidateContext.

    Never raises: a missing or malformed payload degrades to an empty context so
    the interview still happens, just generically.
    """
    if not metadata:
        logger.info("no participant metadata; running a generic interview")
        return CandidateContext()

    try:
        data = json.loads(metadata)
    except json.JSONDecodeError:
        logger.warning("participant metadata was not valid JSON; ignoring it")
        return CandidateContext()

    if not isinstance(data, dict):
        logger.warning("participant metadata was not an object; ignoring it")
        return CandidateContext()

    resume = data.get("resume")
    if not isinstance(resume, dict):
        resume = {}

    skills = [s.strip() for s in resume.get("skills", []) if isinstance(s, str) and s.strip()]

    def fmt_experience(item: dict[str, Any]) -> str | None:
        role, company = _clean(item.get("role")), _clean(item.get("company"))
        if role and company:
            return f"{role} at {company}"
        return role or company

    def fmt_project(item: dict[str, Any]) -> str | None:
        name = _clean(item.get("name"))
        if not name:
            return None
        tech = [t for t in item.get("technologies", []) if isinstance(t, str) and t.strip()]
        return f"{name} ({', '.join(tech[:5])})" if tech else name

    def fmt_education(item: dict[str, Any]) -> str | None:
        degree, institution = _clean(item.get("degree")), _clean(item.get("institution"))
        if degree and institution:
            return f"{degree}, {institution}"
        return degree or institution

    def fmt_research(item: dict[str, Any]) -> str | None:
        return _clean(item.get("title"))

    return CandidateContext(
        name=_clean(data.get("candidateName")),
        role=_clean(data.get("role")),
        campaign_title=_clean(data.get("campaignTitle")),
        skills=skills[:MAX_SKILLS],
        experience=_entries(resume.get("experience"), fmt_experience),
        projects=_entries(resume.get("projects"), fmt_project),
        education=_entries(resume.get("education"), fmt_education),
        research=_entries(resume.get("research"), fmt_research),
    )
