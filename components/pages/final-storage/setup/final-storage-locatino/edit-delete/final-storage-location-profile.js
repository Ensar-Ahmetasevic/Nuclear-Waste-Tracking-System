import useFinalStorageLocationQuery from "./../../../../../../requests/request-final-storage/request-final-storage-location/use-fetch-final-storage-location-query";

import ShowFinalStorageLocation from "./show-final-storage-location";

export default function TableFinalStorageLocation({ OnCancel }) {
  const { data: finalStorageLocationData } = useFinalStorageLocationQuery();

  return (
    <div className="mx-auto pt-8">
      <table className="table border-l-4 border-rose-500">
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Details</th>
            <th>Edit</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {finalStorageLocationData?.map((finalStorageData) => (
            <ShowFinalStorageLocation
              key={finalStorageData.id}
              isCancel={() => OnCancel(null)}
              finalStorageData={finalStorageData}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
