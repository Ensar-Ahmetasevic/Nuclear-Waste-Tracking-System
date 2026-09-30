"use client";
import { useSession } from "next-auth/react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { canAccess } from "../../lib/workspaces.cjs";

const AREAS = [
  { key: "PRE_STORAGE", path: "pre-storage" },
  { key: "FINAL_STORAGE", path: "final-storage" },
];

// Hall alerts of every storage area this person may see: unresolved ones (new
// first, then critical) or the resolved history (newest first). Each alert
// carries `path`, the area's URL segment. Shared by the bell and the alerts page.
export function useAlerts(view = "open", { enabled = true } = {}) {
  const { data: session } = useSession();
  const areas = AREAS.filter((area) => canAccess(session?.user, area.key));
  const queries = useQueries({
    queries: areas.map((area) => ({
      queryKey: ["hallAlerts", area.path, "list", view],
      queryFn: async () => {
        const response = await fetch(
          `/api/${area.path}-setup/alerts${view === "resolved" ? "?view=resolved" : ""}`,
          { signal: AbortSignal.timeout(20000) },
        );
        if (!response.ok) throw new Error("Unable to load alerts");
        const data = await response.json();
        return data.alerts.map((alert) => ({ ...alert, path: area.path }));
      },
      enabled,
      refetchInterval: 60_000,
    })),
  });
  const alerts = queries.flatMap((query) => query.data || []);
  if (view === "open")
    alerts.sort(
      (a, b) =>
        // Worst first: a critical alert stays on top after it has been read.
        (b.severity === "CRITICAL") - (a.severity === "CRITICAL") ||
        Boolean(a.readAt) - Boolean(b.readAt),
    );
  else alerts.sort((a, b) => new Date(b.resolvedAt) - new Date(a.resolvedAt));
  return {
    alerts,
    loading: queries.some((query) => query.isLoading),
    failed: queries.some((query) => query.isError),
  };
}

// Marks an alert read (Supervision and administrators) and refreshes the counts.
export function useMarkRead() {
  const client = useQueryClient();
  return async (alert) => {
    const response = await fetch(`/api/${alert.path}-setup/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId: alert.id, action: "READ" }),
      signal: AbortSignal.timeout(20000),
    });
    await Promise.all([
      client.invalidateQueries({ queryKey: ["hallAlerts"] }),
      client.invalidateQueries({ queryKey: ["workspace"] }),
    ]);
    return response.ok;
  };
}
