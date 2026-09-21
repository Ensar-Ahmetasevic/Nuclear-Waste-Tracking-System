"use client";
import MeasurementForm from "@/components/shared/measurement-form";
export default function ConditionsForm({isOpen,closeModal,hallData}){
  return isOpen ? <MeasurementForm area="final-storage" location={hallData} close={closeModal}/> : null;
}
