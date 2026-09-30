"use client";
import { useT } from "../shell/preferences";
import { useFormat } from "../ui/format";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InlineLoader } from "../loading/loaders";
import { LuScanLine } from "react-icons/lu";
import DeviceScan, { SIMULATION } from "./device-reading";
import AlertProblems from "./alert-problems";
// [form field, parameter, unit, min, max]
const fields = [
  ["Temperature", "TEMPERATURE", "°C"],
  ["RadiationLevel", "RADIATION", "µSv/h", 0],
  ["Humidity", "HUMIDITY", "%", 0, 100],
  ["Pressure", "PRESSURE", "hPa", 0],
];

export default function MeasurementForm({ area, location, close }) {
  const t = useT();
  const format = useFormat();
  const pre = area === "pre-storage",
    prefix = pre ? "preStorage" : "finalStorage";
  const [phase, setPhase] = useState("edit"),
    [message, setMessage] = useState(""),
    [result, setResult] = useState(null);
  const dialog = useRef(null),
    heading = useRef(null),
    busy = useRef(false),
    payload = useRef(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();
  // Values read from a device per field ({ method, device }), which of them the
  // person has confirmed, and the field whose scanner is open.
  const [readings, setReadings] = useState({});
  const [checked, setChecked] = useState([]);
  const [scanFor, setScanFor] = useState(null);
  function applyReading(key, { value, method, device }) {
    setValue(prefix + key, value, { shouldValidate: true, shouldDirty: true });
    setReadings((current) => ({ ...current, [key]: { method, device } }));
    setChecked((current) => current.filter((item) => item !== key));
    setScanFor(null);
  }
  // A typed value replaces the device value; it no longer needs confirming.
  function forgetReading(key) {
    setReadings(({ [key]: _removed, ...rest }) => rest);
    setChecked((current) => current.filter((item) => item !== key));
  }
  // The simulated device reads inside this location's acceptable ranges.
  const rules = useQuery({
    queryKey: ["measurementRules", area, location.id],
    enabled: SIMULATION,
    queryFn: async () => {
      const response = await fetch(
        `/api/${area}-setup/monitoring-rules?location=${location.id}`,
        { signal: AbortSignal.timeout(20000) },
      );
      if (!response.ok) throw Error("Unable to load");
      return (await response.json()).locations[0]?.rules || {};
    },
  });
  const client = useQueryClient();
  const employees = useQuery({
    queryKey: ["measurementEmployees", area],
    queryFn: async () => {
      const response = await fetch(`/api/${area}-setup/${area}-employee`, {
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw Error("Unable to load");
      // Deactivated people keep their history but cannot record new measurements.
      return (await response.json())[prefix + "EmployeeData"].filter(
        (row) => !row.archivedAt,
      );
    },
  });
  useEffect(() => {
    const node = dialog.current,
      trigger = document.activeElement;
    node.showModal();
    heading.current?.focus();
    return () => {
      node.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);
  async function finish() {
    if (busy.current) return;
    close();
    if (result || phase === "unknown" || phase === "conflict")
      await client.invalidateQueries();
  }
  async function save(values) {
    if (busy.current) return;
    if (
      !payload.current &&
      Object.keys(readings).some((key) => !checked.includes(key))
    ) {
      setMessage(t("dev.confirmAll"));
      return;
    }
    if (phase === "error") payload.current = null;
    busy.current = true;
    setPhase("saving");
    setMessage("");
    payload.current ||= {
      ...values,
      [prefix + "LocationId"]: location.id,
      submissionKey: crypto.randomUUID(),
      ...(Object.keys(readings).length && {
        readingSource: {
          readings: Object.entries(readings).map(([field, row]) => ({
            field,
            ...row,
          })),
          confirmed: checked,
        },
      }),
    };
    try {
      const response = await fetch(`/api/${area}-setup/${area}-conditions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.current),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500) throw Error("Unconfirmed");
        setPhase(response.status === 409 ? "conflict" : "error");
        setMessage(data.message || t("meas.form.failed"));
        return;
      }
      if (!data.measurement?.id) throw Error("Missing result");
      setResult({ ...data.measurement, alert: data.alert || null });
      setPhase("success");
      heading.current?.focus();
    } catch {
      setPhase("unknown");
      setMessage(t("meas.form.unconfirmed"));
    } finally {
      busy.current = false;
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="measurement-title"
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
      className="receipt-dialog operational-panel rounded-box border border-base-content/20 bg-base-100 p-6 text-base-content"
    >
      <h2
        ref={heading}
        id="measurement-title"
        tabIndex={-1}
        className="sr-only"
      >
        {result ? t("meas.form.saved") : t("meas.form.title")}
      </h2>
      <p className="mb-3 font-medium">
        {t(pre ? "area.PRE_STORAGE" : "area.FINAL_STORAGE")} · {location.name}
      </p>
      <p className="mb-4 text-sm text-base-content/70">
        {t("meas.form.intro")}
      </p>
      <form
        noValidate
        onSubmit={handleSubmit(save)}
        className={
          phase === "edit" || phase === "error" ? "space-y-4" : "hidden"
        }
      >
        {Object.keys(errors).length > 0 && (
          <p role="alert">{t("meas.form.checkFields")}</p>
        )}
        {fields.map(([key, parameter, unit, min, max]) => {
          const label = t(`param.${parameter}`);
          return (
            <div key={key}>
              <label
                htmlFor={"measurement-" + key}
                className="flex items-center gap-2 text-sm"
              >
                {label} ({unit})
                {readings[key] && (
                  <span className="rounded-full bg-primary/15 px-2 text-xs font-medium text-primary">
                    {t("dev.fromDevice")}
                  </span>
                )}
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id={"measurement-" + key}
                  className="input min-h-11 flex-1"
                  type="number"
                  // Arrow keys and the spinner move by 0.1; the form checks the value itself.
                  step={pre && key === "Pressure" ? "1" : "0.1"}
                  aria-invalid={Boolean(errors[prefix + key])}
                  aria-describedby={
                    errors[prefix + key] ? "error-" + key : undefined
                  }
                  {...register(prefix + key, {
                    valueAsNumber: true,
                    onChange: () => forgetReading(key),
                    required: t("def.error.required", { field: label }),
                    ...(min !== undefined
                      ? {
                          min: {
                            value: min,
                            message: t("meas.form.negative", { field: label }),
                          },
                        }
                      : {}),
                    ...(max !== undefined
                      ? {
                          max: {
                            value: max,
                            message: t("meas.form.max", { field: label, max }),
                          },
                        }
                      : {}),
                    validate: (value) =>
                      (Number.isFinite(value) &&
                        (key !== "Pressure" ||
                          !pre ||
                          Number.isInteger(value))) ||
                      t(
                        pre && key === "Pressure"
                          ? "meas.form.wholeNumber"
                          : "meas.form.number",
                      ),
                  })}
                />
                <button
                  type="button"
                  className={`btn btn-square min-h-11 ${scanFor === key ? "btn-primary" : "border-base-content/20 btn-outline"}`}
                  aria-label={t("dev.scanField", { parameter: label })}
                  aria-expanded={scanFor === key}
                  title={t("dev.scanField", { parameter: label })}
                  onClick={() =>
                    setScanFor((current) => (current === key ? null : key))
                  }
                >
                  <LuScanLine className="size-5" aria-hidden="true" />
                </button>
              </div>
              {scanFor === key && (
                <DeviceScan
                  field={key}
                  label={label}
                  unit={unit}
                  rule={rules.data?.[parameter]}
                  onRead={(reading) => applyReading(key, reading)}
                  onClose={() => setScanFor(null)}
                />
              )}
              {errors[prefix + key] && (
                <p id={"error-" + key} className="mt-1 text-sm text-error">
                  {errors[prefix + key].message}
                </p>
              )}
              {readings[key] && (
                <label
                  className={`mt-2 flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm ${checked.includes(key) ? "border-success/40 bg-success/10" : "border-warning/50 bg-warning/10"}`}
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={checked.includes(key)}
                    onChange={(event) => {
                      setMessage("");
                      setChecked((current) =>
                        event.target.checked
                          ? [...current, key]
                          : current.filter((item) => item !== key),
                      );
                    }}
                  />
                  {t("dev.checked", {
                    device: readings[key].device || t("dev.unknownDevice"),
                  })}
                </label>
              )}
            </div>
          );
        })}
        <label className="block text-sm">
          {t("meas.responsible")}
          <select
            className="select mt-1 w-full"
            aria-invalid={Boolean(errors[prefix + "ResponsibleEmployeeId"])}
            aria-describedby={
              errors[prefix + "ResponsibleEmployeeId"]
                ? "measurement-employee-error"
                : undefined
            }
            {...register(prefix + "ResponsibleEmployeeId", {
              valueAsNumber: true,
              required: t("meas.form.selectEmployee"),
              validate: (value) =>
                (Number.isInteger(value) && value > 0) ||
                t("meas.form.selectEmployee"),
            })}
          >
            <option value="">{t("meas.form.chooseEmployee")}</option>
            {employees.data?.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} {row.surname}
              </option>
            ))}
          </select>
        </label>
        {errors[prefix + "ResponsibleEmployeeId"] && (
          <p id="measurement-employee-error" className="text-sm text-error">
            {t("meas.form.selectEmployee")}
          </p>
        )}
        {employees.isPending && <InlineLoader />}
        {employees.isError && (
          <p role="alert">
            {t("meas.form.employeesError")}{" "}
            <button
              type="button"
              className="btn min-h-11"
              onClick={() => employees.refetch()}
            >
              {t("alert.retry")}
            </button>
          </p>
        )}
        {!employees.isPending &&
          !employees.isError &&
          !employees.data?.length && <p>{t("meas.form.noEmployees")}</p>}
        <button
          type="submit"
          className="btn min-h-11 btn-primary"
          disabled={!employees.data?.length}
        >
          {t("meas.form.save")}
        </button>
      </form>
      {!["edit", "error"].includes(phase) && (
        <div className="space-y-3">
          <dl className="grid grid-cols-2 gap-3 rounded-xl bg-base-200/70 p-4">
            {fields.map(([key, parameter, unit]) => (
              <div key={key}>
                <dt className="text-sm text-base-content/70">
                  {t(`param.${parameter}`)}
                </dt>
                <dd>
                  {(result || payload.current)?.[prefix + key]} {unit}
                </dd>
              </div>
            ))}
            <div className="col-span-2">
              <dt className="text-sm text-base-content/70">
                {t("meas.responsible")}
              </dt>
              <dd>
                {(() => {
                  const id = (result || payload.current)?.[
                    prefix + "ResponsibleEmployeeId"
                  ];
                  const employee = employees.data?.find((row) => row.id === id);
                  return employee
                    ? `${employee.name} ${employee.surname}`
                    : `#${id}`;
                })()}
              </dd>
            </div>
          </dl>
          {result ? (
            <div role="status" className="operational-confirm">
              <p className="font-semibold text-success">
                {t("meas.form.result", { id: result.id })}
              </p>
              <p>
                {t("meas.form.recorded", {
                  time: format.dateTime(result.createdAt),
                  actor: result.recordedById,
                })}
              </p>
              {/* The hall's alert after this measurement; a replayed save does not repeat it. */}
              {result.alert && (
                <div className="mt-2 space-y-1">
                  <AlertProblems problems={result.alert.problems} />
                  <p className="text-sm">
                    {t(
                      result.alert.problems.length
                        ? "halert.saved.problems"
                        : "halert.saved.normal",
                    )}
                  </p>
                </div>
              )}
            </div>
          ) : phase === "saving" ? (
            <InlineLoader save />
          ) : phase === "unknown" ? (
            <button className="btn min-h-11 btn-primary" onClick={() => save()}>
              {t("users.change.check")}
            </button>
          ) : null}
        </div>
      )}
      <p className="my-4 text-sm" aria-live="polite">
        {message}
      </p>
      <div className="mt-5 flex justify-end border-t border-base-content/15 pt-4">
        <button
          disabled={phase === "saving"}
          className="btn min-h-11 btn-outline"
          onClick={finish}
        >
          {result
            ? t("meas.form.done")
            : phase === "unknown"
              ? t("users.change.closeUnconfirmed")
              : phase === "conflict"
                ? t("meas.form.closeHistory")
                : t("common.cancel")}
        </button>
      </div>
    </dialog>
  );
}
