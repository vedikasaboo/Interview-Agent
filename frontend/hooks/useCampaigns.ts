import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { CampaignListItem } from "@/types/models";

// Client-side fetch: the Bearer token lives in the client store, so protected
// data can only be loaded after hydration, in the browser.
export function useCampaigns() {
  const [data, setData] = useState<CampaignListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<CampaignListItem[]>("/api/campaigns"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load campaigns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, refetch: load };
}
