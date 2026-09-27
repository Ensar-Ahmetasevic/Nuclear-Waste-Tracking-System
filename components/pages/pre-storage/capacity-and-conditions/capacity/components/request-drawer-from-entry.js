"use client";
import { useT } from "../../../../../shell/preferences";
import RequestFromEntry from "../request-from-entry";

// Incoming shipments with Container Profiles for this hall. The receipt is
// recorded in the pre-storage receipt form.
export default function RequestDrawerFromEntry({
  hasPendingContainersInHall,
  filteredPendingShippingInformations,
  requestQuantity,
  hallData,
}) {
  const t = useT();
  if (!hasPendingContainersInHall) return null;
  return (
    <section aria-labelledby="incoming-receipts-title" className="space-y-3">
      <h3 id="incoming-receipts-title" className="font-semibold">
        {t("rec.incoming", {
          count: filteredPendingShippingInformations.length,
        })}
      </h3>
      <ul className="space-y-2">
        {requestQuantity.map((request) => (
          <RequestFromEntry
            key={request.id}
            entryData={request}
            hallData={hallData}
          />
        ))}
      </ul>
    </section>
  );
}
