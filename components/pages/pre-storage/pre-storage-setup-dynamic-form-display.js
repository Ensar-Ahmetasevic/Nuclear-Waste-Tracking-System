import FormPreStorageEmployee from "./pre-storage-employee/forms/form-pre-storage-employee";
import TablePreStorageLocation from "./pre-storage-locatino/edit-delete/pre-storage-location-profile";
import TablePreStorageEmployee from "./pre-storage-employee/edit-delete/pre-storage-employee-profile";
import FormPreStorageLocation from "./pre-storage-locatino/forms/form-pre-storage-type";

export default function PreStorageSetupDynamicFormDisplay({
  activeButton,
  setActiveButton,
}) {
  return (
    <div className="flex justify-center">
      {activeButton === "Pre-Storage_Location_Form" ? (
        <FormPreStorageLocation OnCancel={setActiveButton} />
      ) : null}

      {activeButton === "Pre-Storage_Location_Table" ? (
        <TablePreStorageLocation OnCancel={setActiveButton} />
      ) : null}

      {activeButton === "Pre-Storage_Employee_Form" ? (
        <FormPreStorageEmployee OnCancel={setActiveButton} />
      ) : null}

      {activeButton === "Pre-Storage_Employee_Table" ? (
        <TablePreStorageEmployee OnCancel={setActiveButton} />
      ) : null}
    </div>
  );
}
