import Link from "next/link";
import { LuChevronRight } from "react-icons/lu";
import IconTile, { toneOf } from "./icon-tile";

// Key figure with an icon, a unit and a footnote. With `href` the whole card
// opens the list the number counts.
export default function StatCard({
  icon,
  tone,
  label,
  value,
  unit,
  children,
  href,
  highlight = false,
}) {
  // Icon beside the figure when the card is wide enough, above it otherwise.
  const body = (
    <span className="flex flex-col gap-3 @[13rem]:flex-row @[13rem]:items-start @[13rem]:gap-4">
      <IconTile icon={icon} tone={tone} size="lg" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm hyphens-auto text-base-content/75">
          {label}
        </span>
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-3xl font-semibold tabular-nums">
            {value}
          </span>
          {unit && <span className="text-sm text-base-content/60">{unit}</span>}
        </span>
        {children && (
          <span className="mt-1 block text-sm text-base-content/75">
            {children}
          </span>
        )}
      </span>
      {href && (
        <LuChevronRight
          className="hidden size-5 shrink-0 self-center text-base-content/45 @[13rem]:block"
          aria-hidden="true"
        />
      )}
    </span>
  );
  const className = `@container block rounded-box border bg-base-100 p-5 ${
    highlight ? toneOf(tone).edge : "border-base-content/10"
  }`;
  return href ? (
    <Link
      href={href}
      className={`${className} operational-control hover:border-base-content/30`}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
