"use client";
import { useState } from "react";
import { LuPlus } from "react-icons/lu";
import { useT } from "../../../shell/preferences";
import ModalContainerForm from "./../components/modals/modal-container-form";

export default function CreateContainerProfile({ shipment }) {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`btn min-h-11 ${unconfirmed ? "btn-warning" : "border-base-content/20 bg-base-200"}`}
        onClick={() => {
          setStarted(true);
          setIsOpen(true);
        }}
      >
        {!unconfirmed && <LuPlus className="size-4.5" aria-hidden="true" />}
        {unconfirmed ? t("ship.checkPreparation") : t("ship.addProfile")}
      </button>
      {started && (
        <ModalContainerForm
          shipment={shipment}
          open={isOpen}
          suspend={() => setIsOpen(false)}
          onUnconfirmed={setUnconfirmed}
          closeModal={() => {
            setIsOpen(false);
            setStarted(false);
            setUnconfirmed(false);
          }}
        />
      )}
    </>
  );
}
