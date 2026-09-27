import Link from "next/link";
import { LuChevronRight } from "react-icons/lu";
import IconTile from "./icon-tile";

// One row of a task or attention list.
export default function TaskItem({ href, icon, tone, title, meta, aside }) {
  return (
    <li>
      <Link
        href={href}
        className="operational-control flex min-h-15 items-center gap-3 rounded-xl bg-base-200/60 px-3 py-2.5 hover:bg-base-200"
      >
        <IconTile icon={icon} tone={tone} size="sm" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">{title}</span>
          {meta && <span className="text-sm text-base-content/70">{meta}</span>}
        </span>
        {aside && (
          <span className="shrink-0 text-xs text-base-content/60">{aside}</span>
        )}
        <LuChevronRight
          className="size-4.5 shrink-0 text-base-content/50"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}
