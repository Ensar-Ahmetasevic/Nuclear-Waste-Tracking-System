"use client";

import { useQuery } from "@tanstack/react-query";
import { useT } from "../../../../../../shell/preferences";
import { useFormat } from "../../../../../../ui/format";
import { InlineLoader } from "../../../../../../loading/loaders";

// Current pre-storage stock that can still be approved for transfer, after
// administrator-approved corrections and existing reservations. Read-only for Step 3.
export default function PreStorageAvailability({ containerType, requested }) {
  const t = useT();
  const format = useFormat();
  const query = useQuery({
    queryKey: ["preStorageAvailability"],
    queryFn: async () => {
      const response = await fetch(
        "/api/final-storage-setup/pre-storage-availability",
        { signal: AbortSignal.timeout(20000) },
      );
      if (!response.ok) throw Error("Unable to load");
      return (await response.json()).halls;
    },
    refetchOnWindowFocus: false,
  });
  if (query.isPending)
    return (
      <InlineLoader className="text-sm" />
    );
  if (query.isError)
    return (
      <p role="alert" className="text-sm">
        {t("avail.error")}{" "}
        <button
          type="button"
          className="btn min-h-11 btn-sm"
          onClick={() => query.refetch()}
        >
          {t("alert.retry")}
        </button>
      </p>
    );
  const halls = query.data.filter(
    (hall) => hall.containerType === containerType,
  );
  const total = halls.reduce((sum, hall) => sum + hall.available, 0);
  return (
    <section
      aria-label={t("avail.label")}
      className="my-4 rounded-xl border border-base-content/15 p-3 text-sm [overflow-wrap:anywhere]"
    >
      <p className="font-semibold">
        {t("avail.title", { type: containerType, count: total })}
      </p>
      {halls.length ? (
        <ul className="mt-1 list-disc pl-5">
          {halls.map((hall) => (
            <li key={hall.id}>
              {t("avail.hall", {
                name: hall.name,
                available: hall.available,
                recorded: hall.recorded,
                reserved: hall.reserved,
              })}
              {hall.corrected
                ? ` · ${t("avail.corrected", { delta: `${hall.corrected > 0 ? "+" : ""}${hall.corrected}` })}`
                : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1">{t("avail.none")}</p>
      )}
      {/* Present from the start so screen readers announce the warning when typing crosses the limit. */}
      <p
        aria-live="polite"
        className={Number(requested) > total ? "mt-2" : "sr-only"}
      >
        {Number(requested) > total ? t("avail.over") : ""}
      </p>
      <p className="mt-1 text-base-content/70">
        {t("avail.note", { time: format.dateTime(query.dataUpdatedAt) })}
      </p>
    </section>
  );
}
