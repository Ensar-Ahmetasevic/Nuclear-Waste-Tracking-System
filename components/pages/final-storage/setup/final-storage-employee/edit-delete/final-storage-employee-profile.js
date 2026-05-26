import useFinalStorageEmployeeQuery from "./../../../../../../requests/request-final-storage/request-final-storage-employee/use-fetch-final-storage-employee-query";
import ShowFinalStorageEmployee from "./show-final-storage-employee";

export default function TableFinalStorageEmployee({ OnCancel }) {
  const { data: finalStorageEmployeeData } = useFinalStorageEmployeeQuery();

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
          {finalStorageEmployeeData?.map((finalStorageData) => (
            <ShowFinalStorageEmployee
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
