"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useCampaign } from "@/hooks/useCampaign";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusTag } from "@/components/ui/StatusTag";
import { CopyButton } from "@/components/ui/CopyButton";
import { Toast } from "@/components/ui/Toast";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { AddCandidateDrawer } from "@/components/features/AddCandidateDrawer";
import { relativeTime } from "@/lib/time";

// Render a UUID as "a1f9-4c2e-…b2": recognizable, copyable in full via the icon.
function shortToken(token: string): string {
  const compact = token.replace(/-/g, "");
  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}-…${compact.slice(-2)}`;
}

// Next 16: dynamic-route params are a Promise; unwrap with use() in a client page.
export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const campaignId = Number(id);
  const { data, loading, error, refetch } = useCampaign(campaignId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const candidateCount = data?.candidates.length ?? 0;

  return (
    <div className="px-10 py-9">
      <Link href="/dashboard" className="text-sm text-accent hover:text-accent-hover">
        ← Campaigns
      </Link>

      {loading && <DetailSkeleton />}

      {!loading && error && (
        <EmptyState
          title="Couldn't load campaign"
          description={error}
          action={
            <Button variant="secondary" onClick={refetch}>
              Retry
            </Button>
          }
        />
      )}

      {!loading && !error && data && (
        <>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <h1 className="font-display text-4xl text-ink">{data.title}</h1>
              <p className="mt-1 text-sm text-ink-muted">
                {data.role} · {candidateCount} candidate{candidateCount === 1 ? "" : "s"}
              </p>
            </div>
            <Button onClick={() => setDrawerOpen(true)}>Add candidate</Button>
          </div>

          <div className="mt-7">
            {candidateCount === 0 ? (
              <EmptyState
                title="No candidates yet"
                description="Add a candidate to generate their interview invite."
                action={<Button onClick={() => setDrawerOpen(true)}>Add candidate</Button>}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Interview token</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead numeric>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.candidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell className="text-accent">{candidate.name}</TableCell>
                      <TableCell className="text-ink-muted">{candidate.email}</TableCell>
                      <TableCell>
                        <StatusTag status={candidate.status} />
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs text-ink">
                            {shortToken(candidate.interviewToken)}
                          </span>
                          <CopyButton value={candidate.interviewToken} />
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-ink-muted">
                          {relativeTime(candidate.appliedAt)}
                        </span>
                      </TableCell>
                      {/* Score comes from InterviewResult (Phase 8/9); "—" until then. */}
                      <TableCell numeric className="text-ink-muted">
                        —
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <AddCandidateDrawer
            open={drawerOpen}
            campaignId={campaignId}
            onClose={() => setDrawerOpen(false)}
            onCreated={(name) => {
              setDrawerOpen(false);
              setToast(`${name} added`);
              void refetch();
            }}
          />
        </>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mt-3">
      <Skeleton className="h-9 w-1/3" />
      <Skeleton className="mt-2 h-3 w-1/4" />
      <div className="mt-8 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
