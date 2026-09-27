"use client";
import { useT } from "../../../shell/preferences";
import { useFormat } from "../../../ui/format";

// Transport summary for the side column.
export default function TruckDataDetails({ data }) {
  const t = useT();
  const format = useFormat();
  const shipment = data?.shippingData;
  if (!shipment) return null;
  const total = shipment.containerProfiles.reduce(
    (sum, row) => sum + row.quantity,
    0,
  );
  const rows = [
    ["field.companyName", shipment.companyName],
    ["field.driverName", shipment.driverName],
    [
      "ship.plates",
      <span key="plates" className="font-mono">
        {shipment.registrationPlates}
      </span>,
    ],
    ["field.entryDateTime", format.dateTime(shipment.entryDateTime)],
    [
      "field.exitDateTime",
      shipment.exitDateTime ? (
        format.dateTime(shipment.exitDateTime)
      ) : (
        <span key="exit" className="text-base-content/65">
          {t("ship.notRecorded")}
        </span>
      ),
    ],
    ["ship.totalContainers", format.number(total)],
  ];
  return (
    <section
      aria-labelledby="truck-summary-title"
      className="space-y-3 rounded-box border border-base-content/10 bg-base-100 p-5"
    >
      <h2 id="truck-summary-title" className="text-lg font-semibold">
        {t("ship.truck")}
      </h2>
      <dl className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-base-content/65">{t(label)}</dt>
            <dd className="font-medium break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
