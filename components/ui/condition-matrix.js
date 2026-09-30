import Link from "next/link";
import { LuCheck, LuMinus } from "react-icons/lu";
import { ICONS } from "./icon-tile";

export const CELL_STYLES = {
  clear: "bg-success/12 border-success/35 text-success",
  warning: "bg-warning/15 border-warning/50 text-warning",
  critical: "bg-error/20 border-error text-error",
  overdue: "bg-warning/8 border-warning/50 border-dashed text-warning",
  nodata:
    "bg-transparent border-base-content/35 border-dashed text-base-content/60",
};

function CellIcon({ state }) {
  if (state === "clear")
    return <LuCheck className="size-4" aria-hidden="true" />;
  if (state === "nodata")
    return <LuMinus className="size-4" aria-hidden="true" />;
  if (state === "overdue")
    return <ICONS.clock className="size-4" aria-hidden="true" />;
  return (
    <span aria-hidden="true" className="text-base leading-none font-bold">
      !
    </span>
  );
}

// Locations × parameters; each cell shows the worst open alert. A table so
// screen readers can move by row and column. `lead` adds one column after the
// name (e.g. occupancy) so a location's figures stay in one row.
export default function ConditionMatrix({
  caption,
  rows,
  parameters,
  stateLabel,
  lead,
}) {
  return (
    <table className="w-full border-separate border-spacing-1.5 text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className="sr-only">
            {caption}
          </th>
          {lead && (
            <th
              scope="col"
              className="text-left text-[11px] font-semibold tracking-wide text-base-content/65 uppercase"
            >
              {lead.label}
            </th>
          )}
          {parameters.map((parameter) => {
            const Icon = ICONS[parameter.key];
            return (
              <th
                key={parameter.key}
                scope="col"
                title={parameter.label}
                className="font-normal text-base-content/65"
              >
                <span className="flex flex-col items-center gap-0.5 text-[11px] font-semibold tracking-wide uppercase">
                  <Icon className="size-4" aria-hidden="true" />
                  <span className="sr-only">{parameter.label}</span>
                  <span aria-hidden="true">{parameter.short}</span>
                </span>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.area}-${row.id}`}>
            <th scope="row" className="pr-1 text-left font-medium">
              <Link href={row.href} className="hover:underline">
                {row.name}
              </Link>
            </th>
            {lead && <td className="w-2/5 pr-3">{lead.render(row)}</td>}
            {parameters.map((parameter) => {
              const state = row.cells[parameter.key];
              return (
                <td key={parameter.key} className="p-0">
                  <Link
                    href={row.href}
                    title={`${parameter.label}: ${stateLabel(state)}`}
                    className={`flex h-10 items-center justify-center rounded-lg border ${CELL_STYLES[state]}`}
                  >
                    <CellIcon state={state} />
                    <span className="sr-only">{stateLabel(state)}</span>
                  </Link>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
