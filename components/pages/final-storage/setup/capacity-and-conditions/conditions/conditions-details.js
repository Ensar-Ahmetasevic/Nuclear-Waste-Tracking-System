"use client";
import MeasurementDetails from "@/components/shared/measurement-details";
export default function ConditionsDetails({
  toggelModal,
  haleConditions,
  locationId,
}) {
  return (
    <MeasurementDetails
      area="final-storage"
      locationId={locationId}
      measurement={haleConditions}
      onRecord={toggelModal}
    />
  );
}
