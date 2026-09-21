"use client";
import FormTruckData from "../forms/form-truck-data";
export default function ModalTruckDataForm({ closeModal, onSubmitForm }) {
  return <FormTruckData closeModal={closeModal} onSubmitForm={onSubmitForm} />;
}
