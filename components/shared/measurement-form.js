"use client";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
const fields = [
  ["Temperature", "Temperature", "°C"],
  ["RadiationLevel", "Radiation level", "µSv/h", 0],
  ["Humidity", "Humidity", "%", 0, 100],
  ["Pressure", "Pressure", "hPa", 0],
];
export default function MeasurementForm({ area, location, close }) {
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
    formState: { errors },
  } = useForm();
  const client = useQueryClient();
  const employees = useQuery({
    queryKey: ["measurementEmployees", area],
    queryFn: async () => {
      const response = await fetch(`/api/${area}-setup/${area}-employee`, {
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw Error("Unable to load");
      return (await response.json())[prefix + "EmployeeData"];
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
    if (phase === "error") payload.current = null;
    busy.current = true;
    setPhase("saving");
    setMessage("");
    payload.current ||= {
      ...values,
      [prefix + "LocationId"]: location.id,
      submissionKey: crypto.randomUUID(),
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
        setMessage(data.message || "Unable to save measurement.");
        return;
      }
      if (!data.measurement?.id) throw Error("Missing result");
      setResult(data.measurement);
      setPhase("success");
      heading.current?.focus();
    } catch {
      setPhase("unknown");
      setMessage(
        "Save could not be confirmed. Check this same attempt before entering another measurement.",
      );
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
      className="receipt-dialog operational-panel rounded-xl border border-base-content/20 bg-base-100 p-6 text-base-content"
    >
      <h2
        ref={heading}
        id="measurement-title"
        tabIndex={-1}
        className="text-2xl font-bold"
      >
        {result ? "Measurement saved" : "Record measurement"}
      </h2>
      <p className="my-3">
        Step {pre ? 2 : 3} · {location.name} · Location #{location.id}
      </p>
      <p className="mb-4 text-sm text-base-content/70">
        Enter the recorded values. Saving these values does not confirm that the
        location is safe.
      </p>
      <form
        noValidate
        onSubmit={handleSubmit(save)}
        className={
          phase === "edit" || phase === "error" ? "space-y-4" : "hidden"
        }
      >
        {Object.keys(errors).length > 0 && (
          <p role="alert">Check the highlighted fields before saving.</p>
        )}
        {fields.map(([key, label, unit, min, max]) => (
          <div key={key}>
            <label htmlFor={"measurement-" + key} className="block text-sm">
              {label} ({unit})
            </label>
            <input
              id={"measurement-" + key}
              className="input mt-1 w-full"
              type="number"
              step={pre && key === "Pressure" ? "1" : "any"}
              aria-invalid={Boolean(errors[prefix + key])}
              aria-describedby={
                errors[prefix + key] ? "error-" + key : undefined
              }
              {...register(prefix + key, {
                valueAsNumber: true,
                required: `${label} is required`,
                ...(min !== undefined
                  ? {
                      min: {
                        value: min,
                        message: `${label} cannot be negative`,
                      },
                    }
                  : {}),
                ...(max !== undefined
                  ? {
                      max: {
                        value: max,
                        message: `${label} cannot exceed ${max}`,
                      },
                    }
                  : {}),
                validate: (value) =>
                  (Number.isFinite(value) &&
                    (key !== "Pressure" || !pre || Number.isInteger(value))) ||
                  "Enter a valid number" +
                    (pre && key === "Pressure" ? " (whole hPa)" : ""),
              })}
            />
            {errors[prefix + key] && (
              <p id={"error-" + key} className="mt-1 text-sm text-error">
                {errors[prefix + key].message}
              </p>
            )}
          </div>
        ))}
        <label className="block text-sm">
          Responsible employee
          <select
            className="select mt-1 w-full"
            aria-invalid={Boolean(errors[prefix + "ResponsibleEmployeeId"])}
            aria-describedby={errors[prefix + "ResponsibleEmployeeId"] ? "measurement-employee-error" : undefined}
            {...register(prefix + "ResponsibleEmployeeId", {
              valueAsNumber: true,
              required: "Select a responsible employee",
              validate: (value) =>
                (Number.isInteger(value) && value > 0) ||
                "Select a responsible employee",
            })}
          >
            <option value="">Select an employee</option>
            {employees.data?.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} {row.surname}
              </option>
            ))}
          </select>
        </label>
        {errors[prefix + "ResponsibleEmployeeId"] && (
          <p id="measurement-employee-error" className="text-sm text-error">Select a responsible employee.</p>
        )}
        {employees.isPending && <p role="status">Loading employees…</p>}
        {employees.isError && (
          <p role="alert">
            Unable to load employees.{" "}
            <button
              type="button"
              className="btn"
              onClick={() => employees.refetch()}
            >
              Retry
            </button>
          </p>
        )}
        {!employees.isPending &&
          !employees.isError &&
          !employees.data?.length && (
            <p>
              No responsible employees configured. Contact your administrator.
            </p>
          )}
        <button
          type="submit"
          className="btn min-h-11 btn-primary"
          disabled={!employees.data?.length}
        >
          Save measurement
        </button>
      </form>
      {!["edit", "error"].includes(phase) && (
        <div className="space-y-3">
          <dl className="grid grid-cols-2 gap-3 rounded-lg bg-base-200 p-4">
            {fields.map(([key, label, unit]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>
                  {(result || payload.current)?.[prefix + key]} {unit}
                </dd>
              </div>
            ))}
            <div className="col-span-2">
              <dt>Responsible employee</dt>
              <dd>{(() => {
                const id = (result || payload.current)?.[prefix + "ResponsibleEmployeeId"];
                const employee = employees.data?.find(row => row.id === id);
                return employee ? `${employee.name} ${employee.surname}` : `Employee #${id}`;
              })()}</dd>
            </div>
          </dl>
          {result ? (
            <div role="status" className="operational-confirm">
              <p className="font-semibold text-success">
                Measurement #{result.id} saved
              </p>
              <p>
                Recorded at {new Date(result.createdAt).toLocaleString()} · User
                #{result.recordedById}
              </p>
            </div>
          ) : phase === "saving" ? (
            <p role="status">Saving measurement…</p>
          ) : phase === "unknown" ? (
            <button className="btn min-h-11 btn-primary" onClick={() => save()}>
              Check save result
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
            ? "Done — return to location"
            : phase === "unknown"
              ? "Close — save remains unconfirmed"
            : phase === "conflict"
              ? "Close and review history"
              : "Cancel"}
        </button>
      </div>
    </dialog>
  );
}
