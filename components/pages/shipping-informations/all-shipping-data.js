import Link from "next/link";
import dayjs from "dayjs";
import { shipmentGroup } from "../../../lib/shipping-overview.cjs";

export default function AllShippingData({ truck }) {
  const profiles = truck.containerProfiles || [];
  const group = shipmentGroup(truck);
  const quantity = profiles.reduce((sum, profile) => sum + profile.quantity, 0);
  const rejected = profiles.some(profile => profile.containerStatus === "rejected");
  const types = [...new Set(profiles.map(profile => profile.wasteProfile?.containerType?.name).filter(Boolean))];
  const border = group === "missing" ? "border-l-amber-400" : group === "out" ? "border-l-red-500" : "border-l-emerald-500";
  return (
    <article className={`rounded-xl border border-base-content/15 border-l-4 bg-base-100 p-4 sm:p-5 ${border}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-base-content/60">Shipment #{truck.id}</p>
          <h2 className="mt-1 break-words text-lg font-semibold">{truck.companyName}</h2>
          <p className="mt-1 break-words text-sm text-base-content/70">{truck.registrationPlates} · {truck.driverName}</p>
        </div>
        <span className={`badge badge-outline font-semibold ${group === "out" ? "badge-neutral" : "badge-success"}`}>{truck.truckStatus}</span>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="text-sm">
          <p className="text-xs text-base-content/60">Arrival</p>
          <time dateTime={truck.entryDateTime}>{dayjs(truck.entryDateTime).format("DD-MM-YYYY · HH:mm:ss")}</time>
          {truck.exitDateTime && <p className="mt-1 text-base-content/60">Departed {dayjs(truck.exitDateTime).format("DD-MM-YYYY · HH:mm:ss")}</p>}
        </div>
        <div className="text-sm">
          <p className={`font-semibold ${group === "missing" ? "text-amber-400" : ""}`}>{profiles.length ? `${quantity} containers · ${profiles.length} Container Profile${profiles.length === 1 ? "" : "s"}` : "No content recorded"}</p>
          <p className="mt-1 break-words text-xs text-base-content/65">{types.length ? types.join(" · ") : group === "missing" ? "Container quantity and type still need to be recorded." : "No Container Profile attached."}</p>
          {rejected && <p className="mt-2 font-medium text-error">Attention: rejected Container Profile</p>}
        </div>
      </div>
      <div className="mt-4 flex justify-end border-t border-base-content/10 pt-3">
        <Link className="btn btn-sm btn-outline" href={`/shipping-informations/${truck.id}`} aria-label={`Open shipment ${truck.id} — ${truck.companyName}`}>Open shipment →</Link>
      </div>
    </article>
  );
}
