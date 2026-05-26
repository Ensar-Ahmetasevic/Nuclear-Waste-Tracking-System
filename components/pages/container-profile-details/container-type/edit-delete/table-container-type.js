import ShowContainerType from "./show-container-type";
import useContainerTypeQuery from "./../../../../../requests/request-container-profile/request-container-type/use-fetch-container-type-query";

export default function TableContainerType({ OnCancel }) {
  const { data: containerTypeData } = useContainerTypeQuery();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-8">
      <div className="overflow-x-auto">
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
            {containerTypeData?.map((containerData) => (
              <ShowContainerType
                key={containerData.id}
                isCancel={() => OnCancel(null)}
                containerData={containerData}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
