// The range a value was judged against, as a sentence in the interface language.
export function ruleSentence(t, rule, unit) {
  const range =
    rule.lowerWarning != null && rule.upperWarning != null
      ? t("rule.between", {
          low: rule.lowerWarning,
          high: rule.upperWarning,
          unit,
        })
      : rule.lowerWarning != null
        ? t("rule.atLeast", { low: rule.lowerWarning, unit })
        : t("rule.upTo", { high: rule.upperWarning, unit });
  const parts = [
    rule.lowerDanger != null && t("rule.below", { value: rule.lowerDanger }),
    rule.upperDanger != null && t("rule.above", { value: rule.upperDanger }),
  ].filter(Boolean);
  return [
    t("rule.within", { range }),
    parts.length
      ? t("rule.danger", { parts: parts.join(t("rule.or")), unit })
      : null,
    t("rule.otherwise"),
    t("rule.every", { hours: rule.intervalHours }),
  ]
    .filter(Boolean)
    .join(" ");
}
