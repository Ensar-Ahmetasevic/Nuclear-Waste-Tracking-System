"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LuArrowRight, LuInfo } from "react-icons/lu";
import Link from "next/link";
import { MONITORING_PARAMETERS, classify } from "@/lib/monitoring";
import { useT } from "../shell/preferences";
import { readingDevices } from "../../lib/measurement-reading.cjs";
import { useFormat } from "../ui/format";
import StatusChip from "../ui/status-chip";
import { ruleSentence } from "./rule-sentence";
import AlertProblems, { AlertState } from "./alert-problems";

const LEVEL = {
  optimal: ["success", "border-success/40"],
  warning: ["warning", "border-warning/60"],
  danger: ["error", "border-error/60"],
  unknown: ["neutral", "border-base-content/15"],
};

async function read(path) {
  const response = await fetch(path, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw Error("Unable to load");
  return response.json();
}

export default function MeasurementDetails({
  area,
  locationId,
  measurement,
  onRecord,
}) {
  const t = useT();
  const format = useFormat();
  const [range, setRange] = useState(null);
  const prefix = area === "pre-storage" ? "preStorage" : "finalStorage";
  const employee = measurement?.[prefix + "ResponsibleEmployee"];
  const recordedAt = measurement?.createdAt;
  // Rules of this hall classify the values; the alert list also records overdue measurements.
  const rules = useQuery({
    queryKey: ["monitoringRules", area, locationId],
    queryFn: () =>
      read(`/api/${area}-setup/monitoring-rules?location=${locationId}`),
    enabled: Boolean(locationId),
    refetchOnWindowFocus: false,
  });
  const alerts = useQuery({
    queryKey: ["hallAlerts", area, "location", locationId],
    queryFn: () => read(`/api/${area}-setup/alerts?location=${locationId}`),
    enabled: Boolean(locationId),
    refetchOnWindowFocus: false,
  });
  const alert = alerts.data?.alerts?.[0];
  const hallRules = rules.data?.locations?.[0]?.rules;
  const nextDue =
    hallRules && recordedAt
      ? Math.min(
          ...MONITORING_PARAMETERS.map(
            (parameter) =>
              new Date(recordedAt).getTime() +
              hallRules[parameter.key].intervalHours * 3600000,
          ),
        )
      : null;
  const overdue = nextDue != null && nextDue < Date.now();
  const recorder = measurement?.recordedById
    ? t("ship.activity.user", { actor: measurement.recordedById })
    : null;
  return (
    <section className="space-y-4" aria-label={t("meas.latest")}>
      {measurement ? (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MONITORING_PARAMETERS.map(({ key, field, unit }) => {
            const value = measurement[prefix + field];
            const available =
              typeof value === "number" && Number.isFinite(value);
            const level =
              available && hallRules
                ? classify(hallRules[key], value)
                : "unknown";
            const [tone, border] = LEVEL[level];
            return (
              <div
                key={key}
                className={`space-y-2 rounded-xl border bg-base-200/60 p-4 ${border}`}
              >
                <dt className="flex items-center justify-between gap-2 text-sm text-base-content/70">
                  {t(`param.${key}`)}
                  {hallRules && (
                    <button
                      type="button"
                      aria-label={t("meas.rangeOf", {
                        parameter: t(`param.${key}`),
                      })}
                      title={t("meas.rangeOf", {
                        parameter: t(`param.${key}`),
                      })}
                      className="btn -my-2 -mr-2 btn-square min-h-11 btn-ghost text-base-content/60 btn-sm"
                      onClick={() => setRange({ key, unit })}
                    >
                      <LuInfo className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </dt>
                <dd className="text-2xl font-semibold break-words tabular-nums">
                  {available
                    ? `${format.measure(value)} ${unit}`
                    : t("ship.notRecorded")}
                </dd>
                <dd>
                  {hallRules ? (
                    <StatusChip tone={tone}>
                      {t(`records.level.${level}`)}
                    </StatusChip>
                  ) : (
                    <span className="text-sm">
                      {rules.isError
                        ? t("meas.rangesError")
                        : t("meas.rangesLoading")}
                    </span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      ) : (
        <p className="text-sm text-base-content/70">{t("meas.none")}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-stretch">
        {measurement && (
          <div className="rounded-xl bg-base-200/60 p-4">
            <p className="text-xs font-semibold tracking-wide text-base-content/60 uppercase">
              {t("meas.last")}
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {format.dateTime(recordedAt)}
            </p>
            <p className="text-sm text-base-content/70">
              {[
                employee && `${employee.name} ${employee.surname}`,
                recorder && t("meas.by", { person: recorder }),
                measurement.readingSource &&
                  t("meas.fromDevice", {
                    device: readingDevices(measurement.readingSource)
                      .map((device) => device || t("dev.unknownDevice"))
                      .join(", "),
                  }),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        )}
        {nextDue && (
          <div
            className={`rounded-xl border-2 p-4 ${overdue ? "border-warning bg-warning/10" : "border-primary/40 bg-primary/5"}`}
          >
            <p
              className={`text-xs font-semibold tracking-wide uppercase ${overdue ? "text-warning" : "text-primary"}`}
            >
              {t("meas.next")}
            </p>
            <p className="text-lg font-semibold">
              {overdue
                ? t("meas.overdueSince", { age: format.age(nextDue) })
                : t("meas.inTime", {
                    // Time until the due date, in the same units as ages.
                    age: format.age(Date.now() - (nextDue - Date.now())),
                  })}
            </p>
          </div>
        )}
        <button
          type="button"
          className="operational-control btn h-auto min-h-11 btn-primary sm:self-stretch"
          onClick={onRecord}
        >
          {t("meas.record")}
        </button>
      </div>
      {/* The hall's unresolved alert: what is wrong, and its messages and handling. */}
      {alert && (
        <Link
          href={`/${area}/alerts/${alert.id}`}
          className={`flex min-h-14 items-center gap-3 rounded-xl border-2 p-3 hover:bg-base-content/5 ${
            !alert.problems.length
              ? "border-success/50 bg-success/10"
              : alert.severity === "CRITICAL"
                ? "border-error bg-error/10"
                : "border-warning bg-warning/10"
          }`}
        >
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t("halert.banner")}</span>
            <AlertProblems problems={alert.problems} className="text-sm" />
          </span>
          <AlertState alert={alert} />
          <LuArrowRight className="size-4 shrink-0" aria-hidden="true" />
        </Link>
      )}
      {range && hallRules && (
        <RangeDialog
          title={t(`param.${range.key}`)}
          rule={hallRules[range.key]}
          unit={range.unit}
          onClose={() => setRange(null)}
        />
      )}
    </section>
  );
}

// Range, danger limits and interval of one parameter, with whether they were confirmed.
function RangeDialog({ title, rule, unit, onClose }) {
  const t = useT();
  const dialog = useRef(null);
  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    return () => node.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="range-dialog-title"
      className="modal"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-box space-y-3">
        <h3 id="range-dialog-title" className="text-lg font-semibold">
          {t("meas.rangeOf", { parameter: title })}
        </h3>
        <p>{ruleSentence(t, rule, unit)}</p>
        {rule.confirmed && (
          <p className="text-sm text-base-content/70">
            {t("meas.confirmed", { reference: rule.approvalReference })}
          </p>
        )}
        <div className="modal-action">
          <button type="button" className="btn min-h-11" onClick={onClose}>
            {t("ret.close")}
          </button>
        </div>
      </div>
      <button
        type="button"
        className="modal-backdrop"
        aria-label={t("ret.close")}
        onClick={onClose}
      />
    </dialog>
  );
}
