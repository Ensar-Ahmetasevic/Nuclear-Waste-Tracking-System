// Labels and one line of detail for each journey step, in the interface language.
export function journeyView(
  t,
  format,
  journey,
  { returnState = null, people = {} } = {},
) {
  const containers = (count) =>
    t("ship.containers", { count: format.number(count) });
  const by = (step) =>
    step.at
      ? step.actorId
        ? people[step.actorId]
          ? t("journey.byName", {
              time: format.dateTime(step.at),
              actor: people[step.actorId],
            })
          : t("journey.by", {
              time: format.dateTime(step.at),
              actor: step.actorId,
            })
        : format.dateTime(step.at)
      : null;
  const detail = (step) => {
    switch (step.key) {
      case "arrival":
        return by(step);
      case "content":
        return step.done
          ? t("journey.content.done", {
              profiles: t("ship.profileCount", { count: step.profiles }),
              containers: containers(step.containers),
            })
          : step.state === "current"
            ? t("journey.content.waiting")
            : t("journey.content.upcoming");
      case "receipt":
        if (step.done)
          return t("journey.receipt.done", {
            containers: containers(step.progress.total),
          });
        if (step.state === "blocked")
          return returnState === "escalated"
            ? t("journey.receipt.onHold")
            : t("journey.receipt.blocked", { count: step.rejected });
        return step.profiles
          ? t("journey.receipt.progress", {
              done: step.profilesReceived,
              total: step.profiles,
            })
          : t("journey.receipt.upcoming");
      case "departure":
        return step.done
          ? by(step) || t("ship.status.OUT")
          : t("journey.departure.pending");
    }
  };
  const steps = journey.steps.map((step) => ({
    ...step,
    label: t(`journey.step.${step.key}`),
    detail: detail(step),
    progress: step.key === "receipt" && step.profiles ? step.progress : null,
    progressLabel: t("journey.receipt.meter"),
  }));
  const index = steps.findIndex((step) => step.key === journey.current);
  const summary =
    index < 0
      ? t("journey.summary.done")
      : t("journey.summary", {
          step: index + 1,
          total: steps.length,
          label: steps[index].label,
          state: t(`journey.state.${steps[index].state}`),
        });
  const heading =
    index < 0
      ? t("journey.summary.done")
      : t("journey.stepOf", {
          step: index + 1,
          total: steps.length,
          label: steps[index].label,
        });
  return { steps, summary, heading, current: index < 0 ? null : steps[index] };
}
