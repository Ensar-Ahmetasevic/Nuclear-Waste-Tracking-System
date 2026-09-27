"use client";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { areas, manages } from "../../lib/workspaces.cjs";

// Work area summary shared by the home page and the navigation badges (one cache
// entry). It refreshes every minute while the tab is visible.
export const WORKSPACE_REFRESH_MS = 60_000;

export function useWorkspace() {
  const { data: session } = useSession();
  const user = session?.user;
  const assigned = manages(user) || Boolean(areas[user?.workArea]);
  const query = useQuery({
    queryKey: ["workspace", user?.id, user?.workArea],
    enabled: Boolean(user) && assigned,
    refetchInterval: WORKSPACE_REFRESH_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    queryFn: async () => {
      const response = await fetch("/api/workspace", {
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error("Unable to load workspace");
      return response.json();
    },
  });
  return { user, assigned, query };
}
