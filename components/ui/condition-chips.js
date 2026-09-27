import { LuCheck, LuMinus } from "react-icons/lu";
import { CELL_STYLES } from "./condition-matrix";
import { ICONS } from "./icon-tile";

// The four monitored parameters of one location as small labelled chips.
export default function ConditionChips({ cells, parameters, stateLabel }) {
  return (
    <ul className="grid grid-cols-4 gap-1.5">
      {parameters.map((parameter) => {
        const state = cells[parameter.key];
        const Icon = ICONS[parameter.key];
        return (
          <li
            key={parameter.key}
            title={`${parameter.label}: ${stateLabel(state)}`}
            className={`flex h-10 items-center justify-center gap-1 rounded-lg border text-xs font-semibold ${CELL_STYLES[state]}`}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {state === "clear" ? (
              <LuCheck className="size-3.5" aria-hidden="true" />
            ) : state === "nodata" ? (
              <LuMinus className="size-3.5" aria-hidden="true" />
            ) : (
              <span aria-hidden="true">!</span>
            )}
            <span className="sr-only">
              {parameter.label}: {stateLabel(state)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
