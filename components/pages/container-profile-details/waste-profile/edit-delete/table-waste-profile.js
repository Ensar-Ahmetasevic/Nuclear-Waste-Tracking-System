import useWasteProfileQuery from "./../../../../../requests/request-container-profile/request-waste-profile/use-fetch-waste-profile-query";
import ShowWasteProfile from "./show-waste-profile";

export default function TableWasteProfile({ OnCancel }) {
  const { data: wasteProfileData } = useWasteProfileQuery();

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
            {wasteProfileData?.map((wasteData) => (
              <ShowWasteProfile
                key={wasteData.id}
                isCancel={() => OnCancel(null)}
                wasteData={wasteData}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
