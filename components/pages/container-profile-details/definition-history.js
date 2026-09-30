"use client";

import { useState } from "react";
import axios from "axios";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DEFINITIONS } from "@/lib/definitions";
import DataFreshness, {
  manualRefreshOptions,
} from "@/components/shared/data-freshness";
import EmptyState from "../../ui/empty-state";
import { TextIn } from "../../ui/message-text";
import { useDefinitionText } from "./definition-text";
import { InlineLoader } from "../../loading/loaders";

// Recorded administrative changes, newest first. Edits made before change
// tracking existed are not reconstructed.
export default function DefinitionHistory({
  kind,
  definitionId = null,
  compact = false,
}) {
  const text = useDefinitionText();
  const { t, format } = text;
  const definition = DEFINITIONS[kind];
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["definitionChanges", kind, definitionId, page],
    queryFn: async () => {
      const params = new URLSearchParams({ type: kind, page: String(page) });
      if (definitionId) params.set("definitionId", String(definitionId));
      return (
        await axios.get(`/api/container-profile/definition-changes?${params}`, {
          timeout: 20000,
        })
      ).data;
    },
    placeholderData: keepPreviousData,
    ...manualRefreshOptions,
  });
  const data = query.data;
  const Heading = compact ? "h3" : "h2";
  const headingId = `definition-history-${kind}-${definitionId || "all"}`;

  return (
    <section className="w-full min-w-0 space-y-3" aria-labelledby={headingId}>
      <Heading id={headingId} className="text-lg font-semibold">
        {definitionId
          ? t("setup.history")
          : t("def.historyOf", { kind: text.kind(kind) })}
      </Heading>
      {!compact && <DataFreshness query={query} />}
      {query.isPending ? (
        <InlineLoader />
      ) : query.isError && !data ? (
        <p role="alert">
          {t("def.history.error")}{" "}
          <button
            type="button"
            className="btn min-h-11"
            onClick={() => query.refetch()}
          >
            {t("alert.retry")}
          </button>
        </p>
      ) : !data.changes.length ? (
        <EmptyState>
          {t(definitionId ? "def.history.noneOne" : "def.history.none")}
        </EmptyState>
      ) : (
        <ol className="space-y-3">
          {data.changes.map((change) => {
            const snapshot = change.after || change.before || {};
            const fields = definition.fields.filter((field) =>
              change.action !== "UPDATE"
                ? true
                : change.after?.changedFields
                  ? change.after.changedFields.includes(field.key)
                  : change.before?.[field.key] !== change.after?.[field.key],
            );
            return (
              <li
                key={change.id}
                className="rounded-xl border border-base-content/15 p-3 text-sm [overflow-wrap:anywhere]"
              >
                <p className="font-semibold">
                  {t("def.change", {
                    id: change.id,
                    action: text.action(kind, change.action),
                    kind: text.kind(kind),
                    definition: change.definitionId,
                  })}
                  {snapshot.name ? ` · ${snapshot.name}` : ""}
                </p>
                <p className="text-base-content/70">
                  <time dateTime={change.createdAt}>
                    {format.dateTime(change.createdAt)}
                  </time>{" "}
                  · {t("ship.activity.user", { actor: change.actorId })}
                </p>
                {change.reason && (
                  <p className="mt-1">
                    <TextIn
                      messageKey={change.action === "CREATE" ? "def.note" : "ship.reason"}
                      text={change.reason}
                    />
                  </p>
                )}
                {["CREATE", "UPDATE", "DELETE"].includes(change.action) && (
                  <details className="mt-2">
                    <summary className="min-h-11 cursor-pointer py-2">
                      {t("def.recordedValues")}
                    </summary>
                    <dl className="mt-2 space-y-2">
                      {fields.map((field) => (
                        <div
                          key={field.key}
                          className="rounded-lg bg-base-200/70 p-2"
                        >
                          <dt className="font-semibold">{text.field(field)}</dt>
                          {change.before && (
                            <dd className="whitespace-pre-line">
                              {change.after
                                ? t("ship.before", {
                                    value: text.value(
                                      field,
                                      change.before[field.key],
                                      change.before,
                                    ),
                                  })
                                : text.value(
                                    field,
                                    change.before[field.key],
                                    change.before,
                                  )}
                            </dd>
                          )}
                          {change.after && (
                            <dd className="whitespace-pre-line">
                              {change.before
                                ? t("ship.after", {
                                    value: text.value(
                                      field,
                                      change.after[field.key],
                                      change.after,
                                    ),
                                  })
                                : text.value(
                                    field,
                                    change.after[field.key],
                                    change.after,
                                  )}
                            </dd>
                          )}
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {data && data.pages > 1 && (
        <nav
          aria-label={t("def.history.pages")}
          className="flex flex-wrap items-center gap-3"
        >
          <button
            type="button"
            className="btn min-h-11 btn-outline"
            disabled={page <= 1 || query.isFetching}
            onClick={() => setPage(data.page - 1)}
          >
            {t("ship.previous")}
          </button>
          <span>
            {t("def.history.page", {
              page: data.page,
              pages: data.pages,
              total: data.total,
            })}
          </span>
          <button
            type="button"
            className="btn min-h-11 btn-outline"
            disabled={page >= data.pages || query.isFetching}
            onClick={() => setPage(data.page + 1)}
          >
            {t("ship.next")}
          </button>
        </nav>
      )}
    </section>
  );
}
