"use client";

import { use, useEffect, useRef, useState } from "react";
import type { Room } from "livekit-client";
import { api, ApiError } from "@/lib/api";

interface InterviewAccess {
  token: string;
  url: string;
  roomName: string;
  candidateName: string;
}

type Status = "loading" | "connecting" | "connected" | "error";

export default function InterviewPage({
  params,
}: {
  params: Promise<{ interviewToken: string }>;
}) {
  const { interviewToken } = use(params);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    let cancelled = false;
    const audioEls: HTMLMediaElement[] = [];

    (async () => {
      try {
        // Public endpoint; skip the 401→/login handler (this is a candidate, no account).
        const access = await api.post<InterviewAccess>(
          `/api/interviews/${interviewToken}/token`,
          undefined,
          { skip401Handler: true },
        );
        if (cancelled) return;
        setCandidateName(access.candidateName);
        setStatus("connecting");

        // Browser-only SDK — load it here so it never evaluates during SSR.
        const { Room, RoomEvent, Track } = await import("livekit-client");
        const room = new Room();
        roomRef.current = room;

        // Play the agent's voice: livekit-client subscribes to remote tracks but
        // does NOT auto-play them — each audio track must be attached to an element.
        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Audio) {
            const el = track.attach();
            el.style.display = "none";
            document.body.appendChild(el);
            audioEls.push(el);
          }
        });

        await room.connect(access.url, access.token);
        if (cancelled) return;
        await room.localParticipant.setMicrophoneEnabled(true);
        if (cancelled) return;
        setStatus("connected");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setError("This interview link is invalid or has expired.");
        } else if (err instanceof Error && /permission|denied|notallowed/i.test(err.message)) {
          setError("Microphone access is required to start the interview.");
        } else {
          setError("Couldn't connect to the interview. Please refresh and try again.");
        }
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      audioEls.forEach((el) => el.remove());
      roomRef.current?.disconnect();
    };
  }, [interviewToken]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="w-full max-w-md text-center">
        <span className="font-mono text-sm font-bold tracking-[0.16em] text-ink">screener-agent</span>

        {status === "loading" && (
          <p className="mt-10 text-ink-muted">Preparing your interview…</p>
        )}

        {status === "connecting" && (
          <>
            <h1 className="mt-8 font-display text-3xl text-ink">
              Hi{candidateName ? `, ${candidateName.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-3 text-ink-muted">Connecting you to the interview room…</p>
          </>
        )}

        {status === "connected" && (
          <>
            <h1 className="mt-8 font-display text-3xl text-ink">
              You&rsquo;re connected{candidateName ? `, ${candidateName.split(" ")[0]}` : ""}
            </h1>
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-success">
              <span className="h-2 w-2 rounded-full bg-success" />
              Microphone live
            </div>
            <p className="mt-6 text-sm text-ink-muted">
              The interviewer will begin shortly. Speak naturally when it asks a question.
            </p>
            <button
              type="button"
              onClick={() => {
                roomRef.current?.disconnect();
                window.location.reload();
              }}
              className="mt-8 rounded-md border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
            >
              Leave
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="mt-8 font-display text-3xl text-ink">Can&rsquo;t start the interview</h1>
            <p className="mt-3 text-error">{error}</p>
          </>
        )}
      </div>
    </main>
  );
}
