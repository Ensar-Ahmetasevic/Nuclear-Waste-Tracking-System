"use client";
import { useT } from "../../../../shell/preferences";
import { useFormat } from "../../../../ui/format";

// One incoming group of containers: its waste profile and quantity. The waste
// profile opens the specification of its container type.
function IncomingProfile({ profile }) {
  const t = useT();
  const format = useFormat();
  const type = profile.wasteProfile.containerType;
  const rows = [
    [t("field.containerType"), type?.name],
    [t("def.field.material"), type?.material],
    [t("def.field.volume"), type?.volume != null && `${format.number(type.volume)} m³`],
    [t("def.field.carryingCapacity"), type?.carryingCapacity != null && `${format.number(type.carryingCapacity)} t`],
    [t("def.field.radioactivityLevel"), type?.radioactivityLevel],
    [t("def.field.footprint"), type?.footprint != null && `${format.number(type.footprint)} m²`],
    [t("def.field.physicalProperties"), type?.physicalProperties],
    [t("def.field.description"), type?.description],
  ].filter(([, value]) => value);
  return (
    <details className="text-sm">
      <summary className="min-h-11 cursor-pointer py-2.5 text-lg font-semibold">
        <span className="underline decoration-dotted underline-offset-4">
          {profile.wasteProfile.name}
        </span>{" "}
        · {t("ship.containers", { count: profile.quantity })}
      </summary>
      <dl className="grid gap-x-4 gap-y-1.5 pb-3 sm:grid-cols-[auto_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-base-content/60">{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

// The delivery offered to this hall in one block: carrier and truck, then what it
// brings. The hall itself is known to whoever opened it.
export default function IncomingDelivery({ entryData }) {
  const t = useT();
  return (
    <section className="my-5 space-y-1 rounded-xl bg-base-200/70 p-4">
      <p className="text-sm text-base-content/70">
        {entryData.companyName} ·{" "}
        <span className="font-mono">{entryData.registrationPlates}</span>
      </p>
      {entryData.profiles?.map((profile) => (
        <IncomingProfile key={profile.id} profile={profile} />
      ))}
      {entryData.profiles?.length > 1 && (
        <p className="font-semibold">
          {t("ship.profiles.total", { count: entryData.totalQuantity })}
        </p>
      )}
    </section>
  );
}
