"use client";
import { useT } from "../../shell/preferences";
import { useFormat } from "../../ui/format";
import { personLabel } from "../../shared/person-label";
import MessageText from "../../ui/message-text";

// Recorded events of a shipment, in the interface language: titles from the
// interface text, details and notes through the stored AI translation.
export default function ShipmentTimeline({
  timeline,
  titleId = "shipment-timeline-title",
}) {
  const t = useT();
  const format = useFormat();
  if (!timeline) return null;
  const title = (text) => {
    const key = `event.${text}`;
    const translated = t(key);
    return translated === key ? text : translated;
  };
  return (
    <section
      aria-labelledby={titleId}
      className="space-y-4 rounded-box border border-base-content/10 bg-base-100 p-5"
    >
      <h2 id={titleId} className="text-lg font-semibold">
        {t("ship.activity")}
      </h2>
      {timeline.events.length ? (
        <ol className="space-y-0">
          {timeline.events.map((event, index) => (
            <li key={event.key} className="flex gap-3.5">
              <span
                className="flex w-3.5 flex-col items-center"
                aria-hidden="true"
              >
                <span className="mt-1.5 size-3 shrink-0 rounded-full bg-primary ring-4 ring-primary/20" />
                {index < timeline.events.length - 1 && (
                  <span className="my-1.5 w-0.5 flex-1 bg-base-content/15" />
                )}
              </span>
              <div className="min-w-0 flex-1 space-y-0.5 pb-4">
                <h3 className="font-medium">{title(event.title)}</h3>
                <p className="text-sm text-base-content/70">
                  <time dateTime={event.date}>
                    {format.dateTime(event.date)}
                  </time>{" "}
                  ·{" "}
                  {event.actorId
                    ? personLabel(t, event.actorName, event.actorId)
                    : t("ship.activity.noUser")}
                </p>
                <p className="text-sm break-words text-base-content/75">
                  <MessageText text={event.detail} />
                </p>
                {event.note && (
                  <p className="text-sm">
                    <MessageText text={event.note} />
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-base-content/70">
          {t("ship.activity.empty")}
        </p>
      )}
    </section>
  );
}
