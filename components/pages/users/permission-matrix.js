"use client";
import { useMemo } from "react";
import { LuCheck, LuMinus } from "react-icons/lu";
import { permissionMatrix } from "../../../lib/permission-matrix.cjs";
import { areas } from "../../../lib/workspaces.cjs";
import { useT } from "../../shell/preferences";

const GROUP_TONE = {
  SHIPPING: "border-l-step-1",
  PRE_STORAGE: "border-l-step-2",
  FINAL_STORAGE: "border-l-step-3",
};

// Role × work area × action, computed in the browser from the same rules the
// server checks (lib/permission-matrix.cjs). Read-only: access is changed per
// account in the form above, with a reason and a recorded change.
export default function PermissionMatrix({ highlight }) {
  const t = useT();
  const matrix = useMemo(() => permissionMatrix(), []);
  // Conditions are numbered in the order they first appear in the table.
  const notes = [];
  for (const group of matrix.groups)
    for (const action of group.actions)
      for (const limit of action.limits)
        if (!notes.includes(limit.key)) notes.push(limit.key);
  const subjectLabel = (subject) =>
    subject.area ? t(`area.${subject.area}`) : t(`role.${subject.key}`);
  const managers = matrix.subjects.filter((subject) => !subject.area);
  const employees = matrix.subjects.filter((subject) => subject.area);

  return (
    // Closed by default: a reference, not part of creating an account.
    <details className="group space-y-4 rounded-box border border-base-content/10 bg-base-100 p-5 open:space-y-4 sm:px-6">
      <summary className="min-h-11 cursor-pointer text-lg font-semibold">
        <h2 id="matrix-title" className="inline">
          {t("matrix.title")}
        </h2>
      </summary>
      {highlight && (
        <p className="text-sm text-base-content/75">
          {t("matrix.highlight", {
            access: subjectLabel(
              matrix.subjects.find((subject) => subject.key === highlight) || {
                key: highlight,
              },
            ),
          })}
        </p>
      )}
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-base-content/80">
        <li className="flex items-center gap-2">
          <Mark state="yes" />
          {t("matrix.legend.yes")}
        </li>
        <li className="flex items-center gap-2">
          <Mark state="limited" />
          {t("matrix.legend.limited")}
        </li>
        <li className="flex items-center gap-2">
          <Mark state="no" />
          {t("matrix.legend.no")}
        </li>
      </ul>
      <div className="relative -mx-5 overflow-x-auto sm:-mx-6">
        <table className="w-full min-w-[42rem] border-separate border-spacing-0 text-sm sm:min-w-[52rem]">
          <caption className="sr-only">{t("matrix.caption")}</caption>
          <thead>
            <tr className="text-xs text-base-content/65">
              <td className="sticky left-0 bg-base-100" />
              <th
                scope="colgroup"
                colSpan={managers.length}
                className="px-2 pb-1 font-medium"
              >
                {t("matrix.managers")}
              </th>
              <th
                scope="colgroup"
                colSpan={employees.length}
                className="border-l border-base-content/10 px-2 pb-1 font-medium"
              >
                {t("matrix.employees")}
              </th>
            </tr>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 w-40 min-w-36 border-b border-base-content/15 bg-base-100 py-2 pr-3 pl-5 text-left font-semibold sm:w-72 sm:min-w-56 sm:pl-6"
              >
                {t("matrix.action")}
              </th>
              {matrix.subjects.map((subject, index) => (
                <th
                  key={subject.key}
                  scope="col"
                  className={`w-28 border-b border-base-content/15 px-2 py-2 text-center align-bottom text-xs font-semibold ${
                    index === managers.length
                      ? "border-l border-l-base-content/10"
                      : ""
                  } ${highlight === subject.key ? "bg-primary/10 text-primary" : ""}`}
                >
                  {subjectLabel(subject)}
                </th>
              ))}
            </tr>
          </thead>
          {matrix.groups.map((group) => (
            <tbody key={group.key}>
              <tr>
                <th
                  scope="rowgroup"
                  colSpan={matrix.subjects.length + 1}
                  className={`sticky left-0 border-l-4 bg-base-200/70 py-2 pr-3 pl-4 text-left text-xs font-semibold tracking-wider uppercase sm:pl-5 ${
                    GROUP_TONE[group.key] || "border-l-base-content/25"
                  }`}
                >
                  {areas[group.key]
                    ? t(`area.${group.key}`)
                    : t(`matrix.group.${group.key}`)}
                </th>
              </tr>
              {group.actions.map((action) => (
                <tr key={action.key} className="hover:bg-base-content/[0.03]">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-b border-base-content/10 bg-base-100 py-2.5 pr-3 pl-5 text-left font-normal sm:pl-6"
                  >
                    {t(`matrix.action.${action.key}`)}
                  </th>
                  {matrix.subjects.map((subject, index) => {
                    const state = action.cells[subject.key];
                    const numbers =
                      state === "limited"
                        ? action.limits
                            .filter((limit) =>
                              limit.subjects.includes(subject.key),
                            )
                            .map((limit) => notes.indexOf(limit.key) + 1)
                            .sort((a, b) => a - b)
                        : [];
                    return (
                      <td
                        key={subject.key}
                        className={`border-b border-base-content/10 px-2 py-2.5 text-center ${
                          index === managers.length
                            ? "border-l border-l-base-content/10"
                            : ""
                        } ${highlight === subject.key ? "bg-primary/5" : ""}`}
                      >
                        <Mark state={state} numbers={numbers} />
                        <span className="sr-only">
                          {t(`matrix.state.${state}`)}
                          {numbers.length > 0 &&
                            ` (${numbers.map((number) => t(`matrix.limit.${notes[number - 1]}`)).join("; ")})`}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <ol className="space-y-1.5 text-sm text-base-content/80">
        {notes.map((key, index) => (
          <li key={key} className="flex gap-2">
            <span className="w-4 shrink-0 text-right font-semibold text-warning">
              {index + 1}
            </span>
            <span>{t(`matrix.limit.${key}`)}</span>
          </li>
        ))}
      </ol>
      <p className="text-sm text-base-content/70">{t("matrix.note")}</p>
    </details>
  );
}

function Mark({ state, numbers = [] }) {
  if (state === "no")
    return (
      <LuMinus
        className="mx-auto size-4 text-base-content/35"
        aria-hidden="true"
      />
    );
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-start gap-0.5 ${state === "yes" ? "text-success" : "text-warning"}`}
    >
      <span
        className={`inline-flex size-6 items-center justify-center rounded-full ${state === "yes" ? "bg-success/15" : "bg-warning/15"}`}
      >
        <LuCheck className="size-3.5" strokeWidth={3} />
      </span>
      {numbers.length > 0 && (
        <span className="text-[11px] leading-none font-semibold">
          {numbers.join(",")}
        </span>
      )}
    </span>
  );
}
