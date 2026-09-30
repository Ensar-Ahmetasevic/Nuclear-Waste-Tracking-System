"use client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import usePreStorageEmployeeQuery from "../../../../../../requests/request-pre-storage/request-pre-storage-employee/use-fetch-pre-storage-employee-query";
import TransferConfirmation from "../../../../final-storage/setup/capacity-and-conditions/capacity/components/transfer-confirmation";
import { useT } from "../../../../../shell/preferences";
import { InlineLoader } from "../../../../../loading/loaders";
export default function ModalAcceptRequestFromFinalStorageForm({
  isOpen,
  closeModal,
  requestData,
  accept = true,
}) {
  return isOpen ? (
    <Decision
      key={requestData.id}
      close={closeModal}
      request={requestData}
      accept={accept}
    />
  ) : null;
}
function Decision({ close, request, accept }) {
  const [approval, setApproval] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const trigger = useRef(
    typeof document !== "undefined" ? document.activeElement : null,
  );
  useEffect(
    () => () => {
      requestAnimationFrame(() => {
        if (trigger.current?.isConnected) trigger.current.focus();
      });
    },
    [],
  );
  if (!accept || reviewing)
    return (
      <TransferConfirmation
        preStorage
        request={request}
        accept={accept}
        approval={approval}
        room={{ name: request.requestedByRoom }}
        close={close}
        back={accept ? () => setReviewing(false) : null}
      />
    );
  return (
    <ApprovalFields
      request={request}
      close={close}
      initial={approval}
      review={(value) => {
        setApproval(value);
        setReviewing(true);
      }}
    />
  );
}
function ApprovalFields({ request, close, review, initial }) {
  const t = useT();
  const dialog = useRef(null),
    title = useRef(null),
    nextKey = useRef(initial?.sources.length || 1);
  const sourceSelects = useRef(new Map());
  const employees = usePreStorageEmployeeQuery({ activeOnly: true });
  const [rows, setRows] = useState(
    () =>
      initial?.sources.map((row, index) => ({
        key: index,
        sourceId: String(row.receiptAllocationId),
        quantity: String(row.quantity),
      })) || [
        { key: 0, sourceId: "", quantity: String(request.requestedQuantity) },
      ],
  );
  const [employeeId, setEmployeeId] = useState(
    String(initial?.approvedByEmployeeId || ""),
  );
  const sources = useQuery({
    queryKey: ["transferReceiptSources"],
    queryFn: async () => {
      const response = await fetch("/api/pre-storage-setup/receipt-sources", {
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw Error("Unable to load sources");
      return response.json();
    },
  });
  const sourceList = sources.data?.sources;
  // Per-hall limit after administrator corrections and existing reservations.
  const hallFor = (locationId) =>
    sources.data?.halls?.find((hall) => hall.id === locationId);
  const byHall = new Map();
  for (const row of rows) {
    const source = sourceList?.find((item) => item.id === Number(row.sourceId));
    if (source)
      byHall.set(
        source.locationId,
        (byHall.get(source.locationId) || 0) + (Number(row.quantity) || 0),
      );
  }
  const overHall = [...byHall].filter(
    ([locationId, quantity]) =>
      quantity > (hallFor(locationId)?.available ?? 0),
  );
  const total = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  const ready =
    sources.isSuccess &&
    !sources.isFetching &&
    !sources.isError &&
    employees.isSuccess &&
    rows.every((row) => {
      const source = sourceList.find(
        (item) => item.id === Number(row.sourceId),
      );
      return (
        source &&
        Number.isSafeInteger(Number(row.quantity)) &&
        Number(row.quantity) > 0 &&
        Number(row.quantity) <= source.available
      );
    }) &&
    !overHall.length &&
    new Set(rows.map((row) => row.sourceId)).size === rows.length &&
    total <= 2147483647;
  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    title.current?.focus();
    return () => node.close();
  }, []);
  const updateRow = (key, change) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...change } : row)),
    );
  return (
    <dialog
      ref={dialog}
      aria-labelledby="approval-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      className="receipt-dialog operational-panel rounded-box border border-base-content/20 bg-base-100 p-6 text-base-content"
    >
      <h2
        id="approval-title"
        ref={title}
        tabIndex={-1}
        className="text-2xl font-semibold"
      >
        {t("appr.title")}
      </h2>
      <p className="my-4">
        {t("records.transfer", { id: request.id })} · {request.requestedByRoom}{" "}
        ·{" "}
        {t("appr.requested", {
          containers: t("ship.containers", {
            count: request.requestedQuantity,
          }),
        })}
      </p>
      <p className="my-4 text-sm">{t("appr.intro")}</p>
      {employees.isLoading && <InlineLoader />}
      {employees.isError && (
        <p role="alert">
          {t("meas.form.employeesError")}{" "}
          <button className="btn min-h-11" onClick={() => employees.refetch()}>
            {t("alert.retry")}
          </button>
        </p>
      )}
      {sources.isFetching && <p role="status">{t("appr.refreshing")}</p>}
      {sources.isError && (
        <p role="alert">
          {t("appr.sourcesError")}{" "}
          <button className="btn min-h-11" onClick={() => sources.refetch()}>
            {t("alert.retry")}
          </button>
        </p>
      )}
      {sources.isSuccess && !sourceList.length && <p>{t("appr.noSources")}</p>}
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const employee = employees.data?.find(
            (row) => row.id === Number(employeeId),
          );
          if (!ready || !employee) return;
          review({
            sources: rows.map((row) => {
              const source = sourceList.find(
                (item) => item.id === Number(row.sourceId),
              );
              return {
                receiptAllocationId: source.id,
                quantity: Number(row.quantity),
                sourceLabel: t("appr.sourceLabel", {
                  receipt: source.receiptId,
                  profile: source.containerProfileId,
                  shipment: source.shipmentId,
                  hall: source.locationId,
                }),
              };
            }),
            requestedQuantity: total,
            approvedByEmployeeId: employee.id,
            employeeLabel: employee.name + " " + employee.surname,
          });
        }}
      >
        {rows.map((row, index) => {
          const selected = sourceList?.find(
            (item) => item.id === Number(row.sourceId),
          );
          return (
            <fieldset
              key={row.key}
              className="min-w-0 space-y-3 rounded-xl border border-base-content/15 p-3"
            >
              <legend className="px-1 font-semibold">
                {t("appr.source", { n: index + 1 })}
              </legend>
              <label className="block text-sm">
                {t("appr.sourceReceipt", { n: index + 1 })}
                <select
                  ref={(node) => {
                    if (node) sourceSelects.current.set(row.key, node);
                    else sourceSelects.current.delete(row.key);
                  }}
                  required
                  className="select mt-2 w-full"
                  value={row.sourceId}
                  onChange={(event) =>
                    updateRow(row.key, { sourceId: event.target.value })
                  }
                >
                  <option value="">{t("appr.chooseReceipt")}</option>
                  {sourceList?.map((source) => (
                    <option
                      key={source.id}
                      value={source.id}
                      disabled={rows.some(
                        (other) =>
                          other.key !== row.key &&
                          Number(other.sourceId) === source.id,
                      )}
                    >
                      {t("appr.option", {
                        receipt: source.receiptId,
                        profile: source.containerProfileId,
                        hall: source.locationId,
                        available: source.available,
                      })}
                      {source.linkedLater ? ` · ${t("appr.linkedLater")}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              {selected && (
                <p className="text-sm break-words">
                  {t("appr.selected", {
                    shipment: selected.shipmentId,
                    receipt: selected.receiptId,
                    profile: selected.containerProfileId,
                    hall: selected.locationId,
                    available: selected.available,
                  })}
                  {selected.linkedLater
                    ? ` · ${t("appr.linkedLaterLong")}`
                    : ""}
                </p>
              )}
              {selected && hallFor(selected.locationId) && (
                <HallLimit hall={hallFor(selected.locationId)} />
              )}
              {row.sourceId && sources.isSuccess && !selected && (
                <p role="alert">{t("appr.gone")}</p>
              )}
              <label className="block text-sm">
                {t("appr.quantity", { n: index + 1 })}
                <input
                  className="input mt-2 w-full"
                  type="number"
                  required
                  min="1"
                  step="1"
                  max={selected?.available || 2147483647}
                  value={row.quantity}
                  onChange={(event) =>
                    updateRow(row.key, { quantity: event.target.value })
                  }
                />
              </label>
              {rows.length > 1 && (
                <button
                  type="button"
                  className="btn min-h-11 btn-outline"
                  onClick={() => {
                    setRows((current) =>
                      current.filter((item) => item.key !== row.key),
                    );
                    title.current?.focus();
                  }}
                >
                  {t("appr.remove", { n: index + 1 })}
                </button>
              )}
            </fieldset>
          );
        })}
        <button
          type="button"
          className="btn min-h-11 btn-outline"
          disabled={
            !sources.isSuccess ||
            sources.isError ||
            rows.length >= Math.min(100, sourceList.length)
          }
          onClick={() => {
            const key = nextKey.current++;
            setRows((current) => [
              ...current,
              { key, sourceId: "", quantity: "1" },
            ]);
            requestAnimationFrame(() =>
              sourceSelects.current.get(key)?.focus(),
            );
          }}
        >
          {t("appr.add")}
        </button>
        {overHall.map(([locationId, quantity]) => (
          <p key={locationId} role="alert" className="break-words">
            {t("appr.overHall", {
              name: hallFor(locationId)?.name || `#${locationId}`,
              selected: quantity,
              available: hallFor(locationId)?.available ?? 0,
            })}
          </p>
        ))}
        <p className="rounded-xl bg-base-200/70 p-3" role="status">
          {t("appr.total", {
            total,
            sources: rows.length,
            requested: request.requestedQuantity,
          })}
        </p>
        <p className="text-sm">{t("appr.note")}</p>
        <label className="block text-sm">
          {t("meas.responsible")}
          <select
            required
            className="select mt-2 w-full"
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
          >
            <option value="">{t("meas.form.chooseEmployee")}</option>
            {employees.data?.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} {row.surname}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn min-h-11 btn-success"
          type="submit"
          disabled={!ready || !employeeId}
        >
          {t("xfer.reviewApproval")}
        </button>
      </form>
      <div className="mt-5 flex justify-end">
        <button className="btn min-h-11 btn-outline" onClick={close}>
          {t("common.cancel")}
        </button>
      </div>
    </dialog>
  );
}

function HallLimit({ hall }) {
  const t = useT();
  return (
    <p className="text-sm break-words">
      {t("appr.hallLimit", {
        name: hall.name,
        available: hall.available,
        recorded: hall.recorded,
        reserved: hall.reserved,
      })}
      {hall.corrected
        ? ` ${t("avail.corrected", { delta: `${hall.corrected > 0 ? "+" : ""}${hall.corrected}` })}`
        : ""}
    </p>
  );
}
