"use client";
import MeasurementDetails from "@/components/shared/measurement-details";
export default function ConditionsDetails({ toggelModal, haleConditions }) {
  return <MeasurementDetails area="final-storage" measurement={haleConditions} onRecord={toggelModal} />;
}
