import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCredits() {
  const [credits, setCredits] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const { data } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();

    if (data) setCredits(Number(data.credits));
    setLoading(false);
  }, []);

  useEffect(() => { fetchCredits(); }, [fetchCredits]);

  const hasEnoughCredits = (cost: number) => {
    if (credits === null) return false;
    return credits >= cost;
  };

  return { credits, userId, loading, hasEnoughCredits, refreshCredits: fetchCredits };
}
