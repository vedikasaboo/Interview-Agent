import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { CampaignDetail } from "@/types/models";

export function useCampaign(id: number) {
  const [data, setData] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<CampaignDetail>(`/api/campaigns/${id}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load campaign");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, refetch: load };
}
