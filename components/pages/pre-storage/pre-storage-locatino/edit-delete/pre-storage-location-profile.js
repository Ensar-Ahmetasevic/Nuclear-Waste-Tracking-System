import usePreStorageLocationQuery from "../../../../../requests/request-pre-storage/request-pre-storage-location/use-fetch-pre-storage-location-query";

import ShowPreStorageLocation from "./show-pre-storage-location";

export default function TablePreStorageLocation({ OnCancel }) {
  const { data: preStorageLocationData } = usePreStorageLocationQuery();

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
          {preStorageLocationData?.map((preStorageData) => (
            <ShowPreStorageLocation
              key={preStorageData.id}
              isCancel={() => OnCancel(null)}
              preStorageData={preStorageData}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
