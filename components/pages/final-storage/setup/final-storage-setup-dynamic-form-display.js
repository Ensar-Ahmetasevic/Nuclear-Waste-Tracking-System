import FormFinalStorageEmployee from "./final-storage-employee/forms/form-final-storage-employee";
import TableFinalStorageLocation from "./final-storage-locatino/edit-delete/final-storage-location-profile";
import TableFinalStorageEmployee from "./final-storage-employee/edit-delete/final-storage-employee-profile";
import FormFinalStorageLocation from "./final-storage-locatino/forms/form-final-storage-type";

export default function FinalStorageSetupDynamicFormDisplay({
  activeButton,
  setActiveButton,
}) {
  return (
    <div className="flex justify-center">
      {activeButton === "Final-Storage_Location_Form" ? (
        <FormFinalStorageLocation OnCancel={setActiveButton} />
      ) : null}

      {activeButton === "Final-Storage_Location_Table" ? (
        <TableFinalStorageLocation OnCancel={setActiveButton} />
      ) : null}

      {activeButton === "Final-Storage_Employee_Form" ? (
        <FormFinalStorageEmployee OnCancel={setActiveButton} />
      ) : null}

      {activeButton === "Final-Storage_Employee_Table" ? (
        <TableFinalStorageEmployee OnCancel={setActiveButton} />
      ) : null}
    </div>
  );
}
