"use client";
import { useRef, useState } from "react";
import { LuLogOut, LuPencil, LuTrash2 } from "react-icons/lu";
import { useT } from "../../../shell/preferences";
import { useFormat } from "../../../ui/format";
import IconTile from "../../../ui/icon-tile";
import StatusChip from "../../../ui/status-chip";
import { personLabel } from "../../../shared/person-label";
import CreateContainerProfile from "./../container-data/create-container-profile";
import ModalTruckUpdate from "./../components/modals/modal-truck-update";
import ShipmentDelete from "../components/modals/shipment-delete";
import DepartureReview from "../components/modals/departure-review";
import LabelButton from "../../../shared/record-label";

// Page header of a shipment: identity, status, the actions this role may take
// and the dialogs they open.
export default function TruckData({ data, canEdit = false }) {
  const t = useT();
  const format = useFormat();
  const [statusCorrectionOpen, setStatusCorrectionOpen] = useState(false);
  const [departureOpen, setDepartureOpen] = useState(false);
  const [openModalUpdate, setOpenModalUpdate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletionStarted, setDeletionStarted] = useState(false);
  const [unconfirmedDeletion, setUnconfirmedDeletion] = useState(false);
  const deleteTrigger = useRef(null);
  const shipment = data.shippingData;
  const {
    id,
    companyName,
    driverName,
    registrationPlates,
    entryDateTime,
    truckStatus,
  } = shipment;
  const out = truckStatus === "OUT";
  const permissions = data.permissions || {};
  const secondary = "btn min-h-11 border-base-content/20 btn-ghost";

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 items-start gap-4">
          <IconTile
            icon="truck"
            tone={out ? "neutral" : "step-1"}
            solid
            size="lg"
          />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold sm:text-3xl">
                {t("ship.number", { id })}
              </h1>
              <StatusChip tone={out ? "error" : "warning"}>
                {t(`ship.status.${truckStatus}`)}
              </StatusChip>
              {data.returnState && (
                <StatusChip tone={data.returnState === "escalated" ? "warning" : "error"}>
                  {t(`ship.returnState.${data.returnState}`)}
                </StatusChip>
              )}
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/75">
              <span className="font-medium text-base-content">
                {companyName}
              </span>
              <span aria-hidden="true">•</span>
              <span>{t("ship.driver", { name: driverName })}</span>
              <span aria-hidden="true">•</span>
              <span className="rounded bg-base-content px-1.5 font-mono text-xs font-semibold text-base-100">
                <span className="sr-only">{t("ship.plates")}: </span>
                {registrationPlates}
              </span>
              <span aria-hidden="true">•</span>
              <span>
                {t("ship.entered", { time: format.dateTime(entryDateTime) })}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              {shipment.status !== "accepted" &&
                permissions.canEditContainers &&
                !unconfirmedDeletion && (
                  <CreateContainerProfile shipment={shipment} />
                )}
              <button
                type="button"
                disabled={unconfirmedDeletion}
                className={secondary}
                onClick={() => setOpenModalUpdate(true)}
              >
                <LuPencil className="size-4" aria-hidden="true" />
                {t("ship.edit")}
              </button>
              {permissions.canDelete && (
                <button
                  ref={deleteTrigger}
                  type="button"
                  className="btn min-h-11 btn-soft btn-error"
                  onClick={() => {
                    setDeletionStarted(true);
                    setShowDeleteConfirm(true);
                  }}
                >
                  {!unconfirmedDeletion && (
                    <LuTrash2 className="size-4" aria-hidden="true" />
                  )}
                  {unconfirmedDeletion
                    ? t("ship.checkDeletion")
                    : t("ship.delete")}
                </button>
              )}
              {!out && (
                <button
                  type="button"
                  className="btn min-h-11 btn-primary"
                  disabled={unconfirmedDeletion}
                  onClick={() => setDepartureOpen(true)}
                >
                  <LuLogOut className="size-4" aria-hidden="true" />
                  {t("ship.recordDeparture")}
                </button>
              )}
              {permissions.canCorrectStatus && (
                <button
                  type="button"
                  className={secondary}
                  disabled={unconfirmedDeletion}
                  onClick={() => setStatusCorrectionOpen(true)}
                >
                  {t("ship.correctStatus")}
                </button>
              )}
            </>
          )}
          <LabelButton
            kind="shipment"
            id={id}
            lines={[
              companyName,
              t("ship.entered", { time: format.dateTime(entryDateTime) }),
              t("label.profiles", {
                count: shipment.containerProfiles?.length ?? 0,
                containers: t("ship.containers", {
                  count: format.number(
                    (shipment.containerProfiles || []).reduce(
                      (sum, row) => sum + row.quantity,
                      0,
                    ),
                  ),
                }),
              }),
            ]}
          />
        </div>
      </header>

      {(out || !canEdit || data.departure) && (
        <div role="status" className="space-y-1 text-sm text-base-content/75">
          {out && (
            <p>
              {canEdit ? t("ship.note.outAdmin") : t("ship.note.outReadOnly")}
            </p>
          )}
          {!out && !canEdit && <p>{t("ship.note.readOnly")}</p>}
          {data.departure && (
            <p>
              {t("ship.lastDeparture", {
                id: data.departure.id,
                time: format.dateTime(data.departure.createdAt),
                actor: personLabel(t, data.people?.[data.departure.actorId], data.departure.actorId),
              })}
            </p>
          )}
        </div>
      )}

      {permissions.canCorrectStatus && statusCorrectionOpen && (
        <ModalTruckUpdate
          lifecycle
          modalTruckFormData={shipment}
          closeModal={() => setStatusCorrectionOpen(false)}
        />
      )}
      {canEdit && departureOpen && (
        <DepartureReview
          shipment={shipment}
          close={() => setDepartureOpen(false)}
        />
      )}
      {canEdit && deletionStarted && (
        <ShipmentDelete
          shipment={shipment}
          deletionVersion={data.deletionVersion}
          open={showDeleteConfirm}
          returnFocusRef={deleteTrigger}
          suspend={() => setShowDeleteConfirm(false)}
          onUnconfirmed={setUnconfirmedDeletion}
          closeModal={() => {
            setShowDeleteConfirm(false);
            setDeletionStarted(false);
            setUnconfirmedDeletion(false);
          }}
        />
      )}
      {canEdit && openModalUpdate && (
        <ModalTruckUpdate
          closeModal={() => setOpenModalUpdate(false)}
          modalTruckFormData={shipment}
        />
      )}
    </>
  );
}

// Administrative corrections to the shipment record (administrators only).
export function ShipmentCorrections({ corrections, people = {} }) {
  const t = useT();
  const format = useFormat();
  if (!corrections?.length) return null;
  const fields = [
    "companyName",
    "driverName",
    "registrationPlates",
    "truckStatus",
    "entryDateTime",
    "exitDateTime",
  ];
  return (
    <section
      aria-labelledby="shipment-corrections-title"
      className="space-y-3 rounded-box border border-base-content/10 bg-base-100 p-5"
    >
      <div className="space-y-1">
        <h2 id="shipment-corrections-title" className="text-lg font-semibold">
          {t("ship.corrections.title")}
        </h2>
        <p className="text-sm text-base-content/70">
          {t("ship.corrections.desc")}
        </p>
      </div>
      {corrections.map((record) => (
        <details
          key={record.id}
          className="rounded-xl border border-base-content/15 px-3"
        >
          <summary className="min-h-11 cursor-pointer py-3 text-sm">
            {t("ship.correction", {
              id: record.id,
              time: format.dateTime(record.createdAt),
              actor: personLabel(t, people?.[record.actorId], record.actorId),
            })}
          </summary>
          <div className="space-y-2 pb-3 text-sm">
            <p className="break-words">
              {t("ship.reason", { reason: record.reason })}
            </p>
            {fields
              .filter((key) => record.before[key] !== record.after[key])
              .map((key) => (
                <div key={key} className="break-words">
                  <p className="font-semibold">{t(`field.${key}`)}</p>
                  <p>
                    {t("ship.before", {
                      value: record.before[key] ?? t("ship.notRecorded"),
                    })}
                  </p>
                  <p>
                    {t("ship.after", {
                      value: record.after[key] ?? t("ship.notRecorded"),
                    })}
                  </p>
                </div>
              ))}
          </div>
        </details>
      ))}
    </section>
  );
}
