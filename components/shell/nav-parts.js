"use client";
export { default as IconTile, ICONS, TONES } from "../ui/icon-tile";

export function RadiationMark({ className = "size-6" }) {
  const blade =
    "M10.7 9.75 7.5 4.21A9 9 0 0 1 16.5 4.21L13.3 9.75A2.6 2.6 0 0 0 10.7 9.75Z";
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g fill="currentColor" transform="rotate(60 12 12)">
        <circle cx="12" cy="12" r="1.8" />
        <path d={blade} />
        <path d={blade} transform="rotate(120 12 12)" />
        <path d={blade} transform="rotate(240 12 12)" />
      </g>
    </svg>
  );
}

// Badge counts per navigation item from the /api/workspace summary: open work of
// the area plus its unresolved hall alerts (red when one is critical), since
// alerts are handled in the hall or room they belong to.
export function badgeFor(entry, workspaces) {
  const area = workspaces?.find((row) => row.key === entry.badge);
  if (!area) return null;
  const count = (area.badge || 0) + (area.alerts?.open || 0);
  return count ? { count, critical: area.alerts?.critical > 0 } : null;
}
