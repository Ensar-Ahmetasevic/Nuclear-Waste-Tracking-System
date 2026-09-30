"use client";
import Link from "next/link";
import { useT } from "../shell/preferences";

// Where a page sits in the app, every level one click away. The path follows
// the place (area › hall › alert), not the click history, so it reads the same
// however the page was reached. Items: [{ href, label }]; the last one is the
// current page and has no link.
export default function Breadcrumb({ items }) {
  const t = useT();
  const trail = items.filter(Boolean);
  return (
    <nav
      aria-label={t("ship.breadcrumb")}
      className="flex flex-wrap items-center gap-2 text-sm text-base-content/65"
    >
      {trail.map((item, index) => {
        const last = index === trail.length - 1;
        return (
          <span key={item.href || index} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden="true">›</span>}
            {last || !item.href ? (
              <span
                aria-current={last ? "page" : undefined}
                className={last ? "text-base-content/85" : ""}
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-base-content hover:underline"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
