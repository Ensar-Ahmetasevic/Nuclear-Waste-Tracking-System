"use client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import usePreStorageEmployeeQuery from "../../../../../../requests/request-pre-storage/request-pre-storage-employee/use-fetch-pre-storage-employee-query";
import TransferConfirmation from "../../../../final-storage/setup/capacity-and-conditions/capacity/components/transfer-confirmation";
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
  const trigger = useRef(typeof document !== "undefined" ? document.activeElement : null);
  useEffect(() => () => { requestAnimationFrame(() => { if (trigger.current?.isConnected) trigger.current.focus(); }); }, []);
  if (!accept || reviewing)
    return <TransferConfirmation preStorage request={request} accept={accept} approval={approval}
      room={{ name: request.requestedByRoom }} close={close} back={accept ? () => setReviewing(false) : null} />;
  return <ApprovalFields request={request} close={close} initial={approval}
    review={value => { setApproval(value); setReviewing(true); }} />;
}
function ApprovalFields({ request, close, review, initial }) {
  const dialog = useRef(null), title = useRef(null), nextKey = useRef(initial?.sources.length || 1);
  const sourceSelects = useRef(new Map());
  const employees = usePreStorageEmployeeQuery();
  const [rows, setRows] = useState(() => initial?.sources.map((row, index) => ({ key: index, sourceId: String(row.receiptAllocationId), quantity: String(row.quantity) })) || [{ key: 0, sourceId: "", quantity: String(request.requestedQuantity) }]);
  const [employeeId, setEmployeeId] = useState(String(initial?.approvedByEmployeeId || ""));
  const sources = useQuery({ queryKey: ["transferReceiptSources"], queryFn: async () => {
    const response = await fetch("/api/pre-storage-setup/receipt-sources", { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw Error("Unable to load sources");
    return (await response.json()).sources;
  } });
  const total = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  const ready = sources.isSuccess && !sources.isFetching && !sources.isError && employees.isSuccess && rows.every(row => {
    const source = sources.data.find(item => item.id === Number(row.sourceId));
    return source && Number.isSafeInteger(Number(row.quantity)) && Number(row.quantity) > 0 && Number(row.quantity) <= source.available;
  }) && new Set(rows.map(row => row.sourceId)).size === rows.length && total <= 2147483647;
  useEffect(() => {
    const node = dialog.current; node.showModal(); title.current?.focus();
    return () => node.close();
  }, []);
  const updateRow = (key, change) => setRows(current => current.map(row => row.key === key ? { ...row, ...change } : row));
  return <dialog ref={dialog} aria-labelledby="approval-title" onCancel={event => { event.preventDefault(); close(); }}
    className="receipt-dialog operational-panel rounded-xl border border-base-content/20 bg-base-100 p-6 text-base-content">
    <h2 id="approval-title" ref={title} tabIndex={-1} className="text-2xl font-bold">Prepare transfer approval</h2>
    <p className="my-4">Transfer #{request.id} · {request.requestedByRoom} · Requested: {request.requestedQuantity} containers</p>
    <p className="my-4 text-sm">Choose one or more source receipts and the quantity from each. Verify that every source is suitable for the destination before approval. Older receipts without profile links are not selectable.</p>
    {employees.isLoading && <p role="status">Loading responsible employees…</p>}
    {employees.isError && <p role="alert">Unable to load employees. <button className="btn" onClick={() => employees.refetch()}>Retry employees</button></p>}
    {sources.isFetching && <p role="status">Refreshing source receipts…</p>}
    {sources.isError && <p role="alert">Unable to load receipts. <button className="btn" onClick={() => sources.refetch()}>Retry sources</button></p>}
    {sources.isSuccess && !sources.data.length && <p>No linked receipt with unallocated containers. Record a linked pre-storage receipt before approving a new transfer.</p>}
    <form className="space-y-4" onSubmit={event => {
      event.preventDefault();
      const employee = employees.data?.find(row => row.id === Number(employeeId));
      if (!ready || !employee) return;
      review({ sources: rows.map(row => {
        const source = sources.data.find(item => item.id === Number(row.sourceId));
        return { receiptAllocationId: source.id, quantity: Number(row.quantity), sourceLabel: `Receipt #${source.receiptId} · Profile #${source.containerProfileId} · Shipment #${source.shipmentId} · Hall #${source.locationId}` };
      }), requestedQuantity: total, approvedByEmployeeId: employee.id, employeeLabel: employee.name + " " + employee.surname });
    }}>
      {rows.map((row, index) => {
        const selected = sources.data?.find(item => item.id === Number(row.sourceId));
        return <fieldset key={row.key} className="min-w-0 space-y-3 rounded-lg border border-base-content/20 p-3">
          <legend className="px-1 font-semibold">Source {index + 1}</legend>
          <label className="block">Source receipt {index + 1}
            <select ref={node => { if (node) sourceSelects.current.set(row.key, node); else sourceSelects.current.delete(row.key); }} required className="select mt-2 w-full" value={row.sourceId} onChange={event => updateRow(row.key, { sourceId: event.target.value })}>
              <option value="">Select a linked receipt</option>
              {sources.data?.map(source => <option key={source.id} value={source.id} disabled={rows.some(other => other.key !== row.key && Number(other.sourceId) === source.id)}>Receipt #{source.receiptId} · Profile #{source.containerProfileId} · Hall #{source.locationId} · {source.available} unallocated</option>)}
            </select>
          </label>
          {selected && <p className="text-sm break-words">Shipment #{selected.shipmentId} · Receipt #{selected.receiptId} · Profile #{selected.containerProfileId} · Hall #{selected.locationId} · Available: {selected.available}</p>}
          {row.sourceId && sources.isSuccess && !selected && <p role="alert">This source is no longer available. Choose another receipt.</p>}
          <label className="block">Quantity from source {index + 1}<input className="input mt-2 w-full" type="number" required min="1" step="1" max={selected?.available || 2147483647} value={row.quantity} onChange={event => updateRow(row.key, { quantity: event.target.value })} /></label>
          {rows.length > 1 && <button type="button" className="btn btn-outline min-h-11" onClick={() => { setRows(current => current.filter(item => item.key !== row.key)); title.current?.focus(); }}>Remove source {index + 1}</button>}
        </fieldset>;
      })}
      <button type="button" className="btn btn-outline min-h-11" disabled={!sources.isSuccess || sources.isError || rows.length >= Math.min(100, sources.data.length)} onClick={() => { const key = nextKey.current++; setRows(current => [...current, { key, sourceId: "", quantity: "1" }]); requestAnimationFrame(() => sourceSelects.current.get(key)?.focus()); }}>Add source receipt</button>
      <p className="rounded-lg bg-base-200 p-3" role="status">Total approved: <strong>{total}</strong> containers from {rows.length} source{rows.length === 1 ? "" : "s"}. Requested: {request.requestedQuantity}.</p>
      <p className="text-sm">Unallocated counts cover linked transfers only. Approval reserves all selected quantities together; it does not confirm final receipt.</p>
      <label className="block">Responsible employee<select required className="select mt-2 w-full" value={employeeId} onChange={event => setEmployeeId(event.target.value)}>
        <option value="">Select an employee</option>{employees.data?.map(row => <option key={row.id} value={row.id}>{row.name} {row.surname}</option>)}
      </select></label>
      <button className="btn min-h-11 btn-primary" type="submit" disabled={!ready || !employeeId}>Review approval</button>
    </form>
    <div className="mt-5 flex justify-end"><button className="btn min-h-11 btn-outline" onClick={close}>Cancel</button></div>
  </dialog>;
}
