import useLocationOriginQuery from "./../../../../../requests/request-container-profile/request-location-origin/use-fetch-location-origin-query";
import ShowLocationOrigin from "./show-location-origin";

export default function TableLocationOrigin({ OnCancel }) {
  const { data: locationOriginData } = useLocationOriginQuery();

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
            {locationOriginData?.map((originData) => (
              <ShowLocationOrigin
                key={originData.id}
                isCancel={() => OnCancel(null)}
                originData={originData}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
