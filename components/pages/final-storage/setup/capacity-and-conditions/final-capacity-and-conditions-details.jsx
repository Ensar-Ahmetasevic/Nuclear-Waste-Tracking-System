"use client";
import { useState } from "react";
import { useT } from "../../../../shell/preferences";
import LocationLayout from "../../../storage/location-layout";
import ModalFinalStorageConditionsForm from "./conditions/modal/modal-final-storage-conditions-form";
import CapacityDetails from "./capacity/capacity-details";
import ConditionsDetails from "./conditions/conditions-details";

export default function FinalCapacityAndConditionsDetails({
  finalStorageData,
}) {
  const t = useT();
  const [isModalConditionsOpen, setIsModalConditionsOpen] = useState(false);
  const toggelConditionsModal = () => setIsModalConditionsOpen((prev) => !prev);
  const totalContainers =
    finalStorageData.inventory?.quantity ?? finalStorageData.quantity;
  return (
    <>
      <LocationLayout
        area="FINAL_STORAGE"
        location={finalStorageData}
        containers={totalContainers}
        detail={[
          finalStorageData.containerType,
          t("storage.depth", { depth: finalStorageData.depth }),
        ].join(" · ")}
        operations={<CapacityDetails roomData={finalStorageData} />}
        conditions={
          <ConditionsDetails
            haleConditions={finalStorageData.finalStorageConditions?.at(-1)}
            locationId={finalStorageData.id}
            toggelModal={toggelConditionsModal}
          />
        }
      />
      <ModalFinalStorageConditionsForm
        isOpen={isModalConditionsOpen}
        closeModal={() => toggelConditionsModal()}
        hallData={finalStorageData}
      />
    </>
  );
}
