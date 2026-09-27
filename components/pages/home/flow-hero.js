"use client";
import Link from "next/link";
import { useT } from "../../shell/preferences";
import FlowScene from "../../ui/flow-scene";
import { useFormat } from "../../ui/format";
import { SceneArrow } from "../../ui/scene";

const CHIP = {
  "step-1": "border-step-1/55 text-step-1",
  "step-2": "border-step-2/55 text-step-2",
  "step-3": "border-step-3/60 text-step-3",
};

// Overview hero: the site photo with the live figures of each phase on it.
export default function FlowHero({ pipeline, kpis }) {
  const t = useT();
  const format = useFormat();
  const { arrived, content, pre, transfer, final } = pipeline;
  const stages = [
    {
      key: "step1",
      tone: "step-1",
      href: "/shipping-informations",
      value: format.number(arrived.trucks),
      label: t("flow.trucks", { count: arrived.trucks }),
      detail: arrived.withoutContent
        ? t("flow.trucks.missing", { count: arrived.withoutContent })
        : t("flow.trucks.content", {
            count: content.containers,
            containers: format.number(content.containers),
          }),
      warn: arrived.withoutContent > 0,
    },
    {
      key: "step2",
      tone: "step-2",
      href: "/pre-storage",
      value: format.number(pre.containers),
      label: t("flow.pre", { count: pre.locations }),
      detail: [
        t("capacity.used", { percent: kpis.capacityByArea.PRE_STORAGE }),
        content.awaitingReceipt
          ? t("flow.awaiting", { count: content.awaitingReceipt })
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      warn: content.awaitingReceipt > 0,
    },
    {
      key: "step3",
      tone: "step-3",
      href: "/final-storage",
      value: format.number(transfer.requests),
      label: t("flow.transfers", { count: transfer.requests }),
      detail: t("flow.final", {
        count: final.locations,
        containers: format.number(final.containers),
      }),
      warn: transfer.awaitingReceipt > 0,
    },
  ];
  return (
    <section
      data-theme="nwts-dark"
      aria-labelledby="flow-title"
      className="overflow-hidden rounded-box border border-base-content/10 bg-base-300 text-base-content"
    >
      <h2 id="flow-title" className="sr-only">
        {t("flow.label")}
      </h2>
      <FlowScene preload>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-2/5 bg-linear-to-t from-base-300/90 to-transparent xl:block"
        />
        <ol className="grid gap-2.5 p-3 sm:grid-cols-3 xl:absolute xl:inset-x-5 xl:bottom-5 xl:p-0">
          {stages.map((stage, index) => (
            <li key={stage.key}>
              <Link
                href={stage.href}
                className={`operational-control flex h-full items-center gap-3 rounded-xl border bg-base-300/80 px-3.5 py-3 backdrop-blur hover:bg-base-200/90 ${CHIP[stage.tone]}`}
              >
                <span className="font-mono text-3xl font-semibold tabular-nums">
                  {stage.value}
                </span>
                <span className="flex min-w-0 flex-1 flex-col text-sm text-base-content">
                  <span className="text-xs text-base-content/70 xl:sr-only">
                    {String(index + 1).padStart(2, "0")} ·{" "}
                    {t(`flow.${stage.key}.title`)}
                  </span>
                  <span className="font-semibold">{stage.label}</span>
                  <span
                    className={`text-xs ${stage.warn ? "text-warning" : "text-base-content/70"}`}
                  >
                    {stage.detail}
                  </span>
                </span>
                <SceneArrow />
              </Link>
            </li>
          ))}
        </ol>
      </FlowScene>
    </section>
  );
}
