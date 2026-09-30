import { problemText } from "../../shared/alert-problems";

// Wording for a hall alert row on the overview: the hall and what is wrong there.
export function alertView(t, format, { location, severity, problems }) {
  return {
    icon: "alert",
    tone: severity === "CRITICAL" ? "error" : "warning",
    title: t("attention.alert", { location }),
    meta: problems.length
      ? problems.map((problem) => problemText(t, format, problem)).join(" · ")
      : t("halert.allNormal"),
  };
}
