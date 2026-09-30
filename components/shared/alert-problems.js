"use client";
import { useT } from "../shell/preferences";
import { useFormat } from "../ui/format";
import StatusChip from "../ui/status-chip";

const LEVEL_TEXT = { danger: "text-error", warning: "text-warning" };

// "Temperature 45 °C" or "Measurement overdue" for one problem of a hall alert.
export function problemText(t, format, problem) {
  if (problem.key === "OVERDUE") return t("halert.overdue");
  return `${t(`param.${problem.key}`)} ${format.measure(problem.value)} ${problem.unit}`;
}

// State of an alert as one chip: resolved, back within range, new or read.
export function AlertState({ alert }) {
  const t = useT();
  if (alert.resolvedAt)
    return <StatusChip tone="neutral">{t("halert.state.resolved")}</StatusChip>;
  if (!alert.problems.length)
    return <StatusChip tone="success">{t("halert.state.normal")}</StatusChip>;
  if (!alert.readAt)
    return (
      <StatusChip tone={alert.severity === "CRITICAL" ? "error" : "warning"}>
        {t("halert.state.new")}
      </StatusChip>
    );
  return <StatusChip tone="neutral">{t("halert.state.read")}</StatusChip>;
}

// The problems of an alert on one line, each in the colour of its level.
export default function AlertProblems({ problems, className = "" }) {
  const t = useT();
  const format = useFormat();
  if (!problems.length)
    return (
      <p className={`text-success ${className}`}>{t("halert.allNormal")}</p>
    );
  return (
    <p className={className}>
      {problems.map((problem, index) => (
        <span key={problem.key}>
          {index > 0 && " · "}
          <span className={LEVEL_TEXT[problem.level]}>
            {problemText(t, format, problem)}
          </span>
        </span>
      ))}
    </p>
  );
}
