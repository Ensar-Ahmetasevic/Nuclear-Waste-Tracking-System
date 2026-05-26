import usePreStorageEmployeeQuery from "../../../../../requests/request-pre-storage/request-pre-storage-employee/use-fetch-pre-storage-employee-query";

import ShowPreStorageEmployee from "./show-pre-storage-employee";

export default function TablePreStorageEmployee({ OnCancel }) {
  const { data: preStorageEmployeeData } = usePreStorageEmployeeQuery();

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
          {preStorageEmployeeData?.map((preStorageData) => (
            <ShowPreStorageEmployee
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
