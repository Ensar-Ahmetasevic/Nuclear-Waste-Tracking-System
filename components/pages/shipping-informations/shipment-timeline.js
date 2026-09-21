export default function ShipmentTimeline({ timeline }) {
  if (!timeline) return null;
  return <section aria-labelledby="shipment-timeline-title" className="my-6 space-y-4 rounded-xl border border-base-content/20 p-4 sm:p-6">
    <div><h2 id="shipment-timeline-title" className="text-xl font-semibold">Shipment timeline</h2><p className="mt-1 text-sm text-base-content/70">Latest {timeline.limit} recorded events, newest first. Recorded events remain separate from the current corrected values.</p></div>
    {timeline.events.length ? <ol className="space-y-4 border-l-2 border-base-content/20 pl-4">
      {timeline.events.map(event => <li key={event.key} className="rounded-lg bg-base-200 p-4">
        <h3 className="font-semibold">{event.title}</h3>
        <p className="mt-1 text-sm"><time dateTime={event.date}>{new Date(event.date).toLocaleString()}</time> · {event.actorId ? `User #${event.actorId}` : "User not recorded"}</p>
        <p className="mt-2 break-words text-sm">{event.detail}</p>
      </li>)}
    </ol> : <p>No linked events recorded yet.</p>}
    <details className="rounded-lg border border-base-content/20 p-3" open>
      <summary className="min-h-11 cursor-pointer font-medium">Coverage of this timeline</summary>
      <ul className="list-disc space-y-2 pl-5 text-sm text-base-content/70">{timeline.notes.map(note=><li key={note}>{note}</li>)}</ul>
    </details>
  </section>;
}
