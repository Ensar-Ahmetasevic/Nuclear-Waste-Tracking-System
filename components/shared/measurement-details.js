"use client";

import dayjs from "dayjs";
import getConditionLevel from "@/lib/helpers/getConditionLevel";

const parameters = [
  ["temperature", "Temperature", "Temperature", "°C", "−5 to 35"],
  ["radiation", "RadiationLevel", "Radiation", "µSv/h", "0 to 0.1"],
  ["humidity", "Humidity", "Humidity", "%", "40 to 60"],
  ["pressure", "Pressure", "Pressure", "hPa", "1010 to 1020"],
];
const statuses = {
  optimal: ["Within configured range", "border-success/60"],
  warning: ["Warning", "border-warning"],
  danger: ["Danger", "border-error"],
  unknown: ["Not available", "border-base-content/20"],
};

export default function MeasurementDetails({ area, measurement, onRecord }) {
  const prefix = area === "pre-storage" ? "preStorage" : "finalStorage";
  const employee = measurement?.[prefix + "ResponsibleEmployee"];
  const recordedAt = measurement?.createdAt;
  return (
    <section className="space-y-6" aria-label="Latest recorded measurement">
      <div>
        <h2 className="text-xl font-semibold">Latest recorded measurement</h2>
        <p className="mt-2 text-sm text-base-content/70">
          {measurement
            ? "Statuses describe the saved values using configured ranges. They do not indicate whether an alert has been reviewed."
            : "No measurement has been recorded for this location."}
        </p>
      </div>
      {measurement && <>
        <dl className="grid gap-3 sm:grid-cols-2">
          {parameters.map(([key, field, label, unit]) => {
            const value = measurement[prefix + field];
            const available = typeof value === "number" && Number.isFinite(value);
            const [status, border] = statuses[available ? getConditionLevel(key, value) : "unknown"];
            return <div key={key} className={`rounded-lg border-l-4 bg-base-200 p-4 ${border}`}>
              <dt className="text-sm text-base-content/70">{label}</dt>
              <dd className="mt-1 break-words text-2xl font-semibold">{available ? `${value} ${unit}` : "Not recorded"}</dd>
              <dd className="mt-2 text-sm font-medium">{status}</dd>
            </div>;
          })}
        </dl>
        <dl className="grid gap-4 rounded-lg border border-base-content/20 p-4 sm:grid-cols-2">
          <div><dt className="text-sm text-base-content/70">Responsible employee</dt><dd>{employee ? `${employee.name} ${employee.surname}` : "Not recorded"}</dd></div>
          <div><dt className="text-sm text-base-content/70">Recorded at</dt><dd>{recordedAt && dayjs(recordedAt).isValid() ? dayjs(recordedAt).format("DD/MM/YYYY · HH:mm:ss") : "Not recorded"}</dd></div>
          <div><dt className="text-sm text-base-content/70">Recorded by</dt><dd>{measurement.recordedById ? `User #${measurement.recordedById}` : "Not recorded for this entry"}</dd></div>
          <div><dt className="text-sm text-base-content/70">Measurement reference</dt><dd>#{measurement.id}</dd></div>
        </dl>
      </>}
      <details className="rounded-lg border border-base-content/20 p-4">
        <summary className="cursor-pointer py-2 font-medium focus-visible:outline-2">Configured measurement ranges</summary>
        <p className="my-3 text-sm">Existing application ranges, used to classify each recorded value.</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          {parameters.map(([key, , label, unit, range]) => <div key={key}><dt className="font-medium">{label}</dt><dd>{range} {unit}</dd></div>)}
        </dl>
        <p className="mt-4 text-sm">Warning and Danger labels use the existing application classification rules for values outside these ranges.</p>
      </details>
      <button type="button" className="btn btn-info btn-outline min-h-11 w-full operational-control" onClick={onRecord}>Record new measurement</button>
    </section>
  );
}
