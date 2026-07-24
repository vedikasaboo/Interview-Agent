"use client";

import Link from "next/link";
import { useCampaigns } from "@/hooks/useCampaigns";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { relativeTime } from "@/lib/time";

export default function DashboardPage() {
  const { data, loading, error, refetch } = useCampaigns();

  return (
    <div className="px-10 py-10">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-4xl text-ink">Campaigns</h1>
        <Link href="/campaigns/new">
          <Button>New campaign</Button>
        </Link>
      </header>

      <div className="mt-8">
        {loading && <CardGridSkeleton />}

        {!loading && error && (
          <EmptyState
            title="Couldn't load campaigns"
            description={error}
            action={
              <Button variant="secondary" onClick={refetch}>
                Retry
              </Button>
            }
          />
        )}

        {!loading && !error && data?.length === 0 && (
          <EmptyState
            title="No campaigns yet"
            description="Create your first campaign to start inviting candidates to interview."
            action={
              <Link href="/campaigns/new">
                <Button>New campaign</Button>
              </Link>
            }
          />
        )}

        {!loading && !error && data && data.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((campaign) => (
              <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="block">
                <Card clickable className="h-full">
                  <h2 className="font-mono text-[22px] font-bold leading-tight text-ink">
                    {campaign.title}
                  </h2>
                  <p className="mt-3 text-sm text-ink-muted">{campaign.role}</p>
                  <div className="mt-5 flex items-baseline justify-between">
                    <span className="text-sm text-ink">
                      {campaign._count.candidates} candidate
                      {campaign._count.candidates === 1 ? "" : "s"}
                    </span>
                    <span className="font-mono text-xs text-ink-muted">
                      {relativeTime(campaign.createdAt)}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="mt-3 h-3 w-2/5" />
          <Skeleton className="mt-6 h-3 w-1/2" />
        </Card>
      ))}
    </div>
  );
}
