import TableContainerType from "./container-type/edit-delete/table-container-type";
import FormWasteProfile from "./waste-profile/forms/form-waste-profile";
import FormContainerType from "./container-type/forms/form-container-type";
import FormLocationOrigin from "./location-origin/forms/form-location-origin";
import TableWasteProfile from "./waste-profile/edit-delete/table-waste-profile";
import TableLocationOrigin from "./location-origin/edit-delete/location-origin-profile";

export default function DynamicFormDisplay({ activeButton, setActiveButton }) {
  return (
    <div className="flex justify-center">
      {activeButton === "Location origin Form" ? (
        <FormLocationOrigin OnCancel={setActiveButton} />
      ) : null}

      {activeButton === "Location origin Table" ? (
        <TableLocationOrigin OnCancel={setActiveButton} />
      ) : null}

      {activeButton === "Waste profile Form" ? (
        <FormWasteProfile OnCancel={setActiveButton} />
      ) : null}

      {activeButton === "Waste profile Table" ? (
        <TableWasteProfile OnCancel={setActiveButton} />
      ) : null}

      {activeButton === "Container type Form" ? (
        <FormContainerType OnCancel={setActiveButton} />
      ) : null}

      {activeButton === "Container type Table" ? (
        <TableContainerType OnCancel={setActiveButton} />
      ) : null}
    </div>
  );
}
