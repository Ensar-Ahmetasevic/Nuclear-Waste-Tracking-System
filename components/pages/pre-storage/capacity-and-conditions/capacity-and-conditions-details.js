"use client";
import { useState } from "react";
import LocationLayout from "../../storage/location-layout";
import ModalPreStorageConditionsForm from "./conditions/modal/modal-pre-storage-conditions-form";
import CapacityDetails from "./capacity/capacity-details";
import ConditionsDetails from "./conditions/conditions-details";

export default function CapacityAndConditionsDetails({ preStorageData }) {
  const [isModalConditionsOpen, setIsModalConditionsOpen] = useState(false);
  const toggelConditionsModal = () => setIsModalConditionsOpen((prev) => !prev);
  const totalContainers =
    preStorageData.inventory?.quantity ??
    preStorageData.preStorageEntry.reduce(
      (total, waste) => total + waste.quantity,
      0,
    );
  return (
    <>
      <LocationLayout
        area="PRE_STORAGE"
        location={preStorageData}
        containers={totalContainers}
        operations={<CapacityDetails hallData={preStorageData} />}
        conditions={
          <ConditionsDetails
            haleConditions={preStorageData.preStorageConditions.at(-1)}
            locationId={preStorageData.id}
            toggelModal={toggelConditionsModal}
          />
        }
      />
      <ModalPreStorageConditionsForm
        isOpen={isModalConditionsOpen}
        closeModal={() => toggelConditionsModal()}
        hallData={preStorageData}
      />
    </>
  );
}
