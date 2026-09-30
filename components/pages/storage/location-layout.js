"use client";
import { useT } from "../../shell/preferences";
import { Card, CardHeader } from "../../ui/card";
import CapacityBar, { capacityLevel } from "../../ui/capacity-bar";
import { useFormat } from "../../ui/format";
import PageHeader from "../../ui/page-header";
import { locationTone } from "../../../lib/location-colors";
import StatusChip from "../../ui/status-chip";
import { useWorkspace } from "../../shared/use-workspace";
import HallPlan from "../../ui/hall-plan";
import Breadcrumb from "../../ui/breadcrumb";

const WORST = ["critical", "warning", "overdue", "nodata"];

const AREA = {
  PRE_STORAGE: {
    href: "/pre-storage",
    tone: "step-2",
    scene: "hall",
    position: "50% 60%",
  },
  FINAL_STORAGE: {
    href: "/final-storage",
    tone: "step-3",
    scene: "finalStorage",
    position: "50% 45%",
  },
};

// Page frame of one hall or room: one capacity line beside the operational
// panel, the layout plan and the conditions panel.
export default function LocationLayout({
  area,
  location,
  containers,
  operations,
  conditions,
}) {
  const t = useT();
  const format = useFormat();
  // The page takes the colour of this hall or room, as on its card.
  const style = { ...AREA[area], tone: locationTone(location?.id) };
  // Worst open condition of this location from the workspace summary.
  const { query: workspace } = useWorkspace();
  const cells =
    workspace.data?.workspaces
      ?.find((row) => row.key === area)
      ?.locations?.find((row) => row.id === location.id)?.cells || {};
  const condition =
    WORST.find((state) => Object.values(cells).includes(state)) ||
    (Object.keys(cells).length ? "clear" : null);
  const slots =
    location.containerFootprint > 0
      ? Math.floor(location.surfaceArea / location.containerFootprint)
      : 0;
  const free = Math.max(0, slots - containers);
  const percent = slots ? Math.round((100 * containers) / slots) : 0;
  const level = capacityLevel(percent);
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { href: style.href, label: t(`storage.title.${area}`) },
          { label: location.name },
        ]}
      />
      <PageHeader
        scene={style.scene}
        tone={style.tone}
        position={style.position}
        eyebrow={t(`storage.eyebrow.${area}`)}
        title={location.name}
        top
        actions={
          level !== "normal" && (
            <StatusChip tone={level === "full" ? "error" : "warning"}>
              {level === "full" ? t("capacity.full") : t("capacity.near")}
            </StatusChip>
          )
        }
      />

      {free <= 10 && (
        <p
          role="alert"
          className={`rounded-box border p-4 text-sm ${free <= 5 ? "border-error/50 bg-error/10" : "border-warning/50 bg-warning/10"}`}
        >
          {t(free <= 5 ? "loc.warning.critical" : "loc.warning.notice", {
            count: free,
          })}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card
          as="section"
          aria-labelledby="capacity-title"
          className="space-y-5 lg:col-span-2"
        >
          <CardHeader id="capacity-title" title={t("loc.capacity")} />
          <p className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-3xl font-semibold tabular-nums">
              {percent}%
            </span>
            <span className="text-sm text-base-content/75">
              {t("loc.slotsLine", {
                used: format.number(containers),
                slots: format.number(slots),
                free: format.number(free),
              })}
            </span>
          </p>
          <CapacityBar
            percent={percent}
            tone={style.tone}
            label={t("capacity.aria", {
              name: location.name,
              used: containers,
              slots,
            })}
          />
        </Card>
        <Card
          as="section"
          aria-labelledby="operations-title"
          className="space-y-4 lg:col-span-3"
        >
          <CardHeader
            id="operations-title"
            title={t(`loc.operations.${area}`)}
          />
          {operations}
        </Card>
      </div>

      <Card as="section" aria-labelledby="plan-title" className="space-y-4">
        <CardHeader id="plan-title" title={t("plan.title")} />
        <HallPlan
          name={location.name}
          used={containers}
          slots={slots}
          tone={style.tone}
          condition={condition}
        />
      </Card>

      <Card
        as="section"
        aria-labelledby="conditions-panel-title"
        className="space-y-4"
      >
        <CardHeader id="conditions-panel-title" title={t("conditions.title")} />
        {conditions}
      </Card>
    </main>
  );
}
