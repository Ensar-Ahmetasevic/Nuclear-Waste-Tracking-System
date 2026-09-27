// Shared wording for alert rows on the overview.
export function alertView(
  t,
  { parameter, location, severity, kind, escalated },
) {
  const meta =
    kind === "MISSING"
      ? t("attention.alert.overdue")
      : severity === "CRITICAL"
        ? t("attention.alert.critical")
        : t("attention.alert.warning");
  return {
    icon: kind === "MISSING" ? "clock" : "alert",
    tone: severity === "CRITICAL" ? "error" : "warning",
    title: t("attention.alert", {
      parameter: t(`param.${parameter}`),
      location,
    }),
    meta: escalated ? `${meta} · ${t("attention.escalated")}` : meta,
  };
}

