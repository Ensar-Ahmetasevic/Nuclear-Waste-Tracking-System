"use client";
import { useState } from "react";
import Link from "next/link";
import { LuHistory, LuInfo, LuPencil, LuTrash2 } from "react-icons/lu";
import { useT } from "../../../shell/preferences";
import { useFormat } from "../../../ui/format";
import IconTile from "../../../ui/icon-tile";
import StatusChip from "../../../ui/status-chip";
import ContainerProfileDelete from "../components/modals/container-profile-delete";
import ModalShowContainerDetails from "./../components/modals/modal-show-container-details";
import ModalContainerProfilUpdate from "./../components/modals/modal-container-profile-update";

const STATUS = {
  accepted: { chip: "success", tone: "success" },
  pending: { chip: "warning", tone: "warning" },
  rejected: { chip: "error", tone: "error" },
};

const withoutType = ({ containerType: _type, ...rest }) => rest;

// One Container Profile: its values, receipt progress and the allowed actions.
export default function ShowContainerDetails({ data, canEdit = false }) {
  const t = useT();
  const format = useFormat();
  const [modalContenData, setModalContentData] = useState(null);
  const [openModalDetails, setOpenModalDetails] = useState(false);
  const [openModalUpdate, setOpenModalUpdate] = useState(false);
  const [title, setTitle] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletionStarted, setDeletionStarted] = useState(false);
  const [unconfirmedDeletion, setUnconfirmedDeletion] = useState(false);

  const { quantity, locationOrigin, wasteProfile, containerStatus, id } = data;
  const shownStatus = data.receiptRecorded ? "accepted" : containerStatus;
  const status = STATUS[shownStatus] || STATUS.pending;
  // A linked receipt record counts even if an older status flag says otherwise.
  const accepted = containerStatus === "accepted" || data.receiptRecorded;
  const received = accepted ? quantity : 0;
  const fields = [
    { key: "quantity", value: format.number(quantity), large: true },
    {
      key: "locationOrigin",
      value: locationOrigin?.name,
      details: locationOrigin,
    },
    // The container type has its own field; keep it out of the waste profile dialog.
    {
      key: "wasteProfile",
      value: wasteProfile?.name,
      details: wasteProfile && withoutType(wasteProfile),
    },
    {
      key: "containerType",
      value: wasteProfile?.containerType?.name || t("ship.notRecorded"),
    },
  ];
  const editable =
    canEdit &&
    !data.correctionLocked &&
    ["pending", "rejected"].includes(containerStatus);

  return (
    <article
      className={`space-y-4 rounded-box border bg-base-100 p-5 ${
        shownStatus === "pending"
          ? "border-warning/40"
          : shownStatus === "rejected"
            ? "border-error/50"
            : "border-base-content/10"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconTile icon="box" tone={status.tone} />
          <h3 className="text-base font-semibold">
            {t("ship.profile", { id })}
          </h3>
        </div>
        <StatusChip tone={status.chip}>
          {t(`profile.${shownStatus}`)}
        </StatusChip>
      </div>

      <dl className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {fields.map((field) => (
          <div
            key={field.key}
            className="flex flex-col gap-1 rounded-xl bg-base-200/70 px-3.5 py-3"
          >
            <dt className="text-xs text-base-content/65">
              {t(`field.${field.key}`)}
            </dt>
            <dd className="flex items-start justify-between gap-1">
              <span
                className={`break-words ${field.large ? "text-lg font-semibold" : "text-sm font-medium"}`}
              >
                {field.value}
              </span>
              {field.details && (
                <button
                  type="button"
                  aria-label={t("ship.profile.details", {
                    field: t(`field.${field.key}`),
                    id,
                  })}
                  className="btn -my-2 -mr-2 btn-square min-h-11 shrink-0 btn-ghost text-base-content/70 btn-sm"
                  onClick={() => {
                    setModalContentData(field.details);
                    setTitle(t(`field.${field.key}`));
                    setOpenModalDetails(true);
                  }}
                >
                  <LuInfo className="size-4" aria-hidden="true" />
                </button>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div
          role="meter"
          aria-label={t("journey.receipt.meter")}
          aria-valuemin={0}
          aria-valuemax={quantity}
          aria-valuenow={received}
          className="h-2 min-w-32 flex-1 overflow-hidden rounded-full bg-base-content/10"
        >
          <div
            className="h-full rounded-full bg-success"
            style={{ width: `${quantity ? (100 * received) / quantity : 0}%` }}
          />
        </div>
        <span className="text-sm text-base-content/80">
          {t("ship.received", {
            done: format.number(received),
            total: format.number(quantity),
          })}
        </span>
        {shownStatus === "pending" && (
          <span className="text-sm text-base-content/70">
            {t("ship.profile.next")}
          </span>
        )}
        {shownStatus === "rejected" && !data.lastReturn && (
          <span className="text-sm text-error">
            {t("ship.profile.rejectedNext")}
          </span>
        )}
      </div>

      {shownStatus === "rejected" && data.lastReturn && (
        <p className="text-sm text-error">
          {t(`return.onProfile.${data.lastReturn.state === "escalated" ? "escalated" : "open"}`, {
            id: data.lastReturn.id,
            hall: data.lastReturn.hall || `#${data.lastReturn.locationId}`,
          })}
        </p>
      )}
      {shownStatus === "pending" && data.lastReturn && (
        <p className="text-sm text-base-content/70">
          {t("return.corrected", {
            time: format.dateTime(data.lastReturn.createdAt),
            hall: data.lastReturn.hall || `#${data.lastReturn.locationId}`,
          })}
        </p>
      )}
      {data.correctionLocked && (
        <p className="text-sm text-base-content/70">{t("ship.locked")}</p>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-base-content/10 pt-3">
        <Link
          href={`/profiles/${id}`}
          aria-label={t("custody.openAria", { id })}
          className="btn min-h-11 border-base-content/20 btn-ghost btn-sm"
        >
          <LuHistory className="size-4" aria-hidden="true" />
          {t("custody.openLink")}
        </Link>
        <span className="flex-1" />
        {editable && (
          <>
            <button
              type="button"
              aria-label={t("ship.profile.edit", { id })}
              title={t("ship.profile.edit", { id })}
              className="btn btn-square min-h-11 btn-soft btn-warning"
              disabled={unconfirmedDeletion}
              onClick={() => setOpenModalUpdate(true)}
            >
              <LuPencil className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={
                unconfirmedDeletion
                  ? t("ship.profile.checkDeletion", { id })
                  : t("ship.profile.delete", { id })
              }
              title={t("ship.profile.delete", { id })}
              className={`btn min-h-11 btn-soft btn-error ${unconfirmedDeletion ? "" : "btn-square"}`}
              onClick={() => {
                setDeletionStarted(true);
                setShowDeleteConfirm(true);
              }}
            >
              {unconfirmedDeletion ? (
                t("ship.checkDeletion")
              ) : (
                <LuTrash2 className="size-4" aria-hidden="true" />
              )}
            </button>
          </>
        )}
      </div>

      {canEdit && deletionStarted && (
        <ContainerProfileDelete
          profile={data}
          open={showDeleteConfirm}
          suspend={() => setShowDeleteConfirm(false)}
          onUnconfirmed={setUnconfirmedDeletion}
          closeModal={() => {
            setShowDeleteConfirm(false);
            setDeletionStarted(false);
            setUnconfirmedDeletion(false);
          }}
        />
      )}
      {openModalDetails && (
        <ModalShowContainerDetails
          closeModal={() => setOpenModalDetails(false)}
          modalContenData={modalContenData}
          title={title}
        />
      )}
      {editable && openModalUpdate && (
        <ModalContainerProfilUpdate
          closeModal={() => setOpenModalUpdate(false)}
          modalContainerProfilData={data}
        />
      )}
    </article>
  );
}
