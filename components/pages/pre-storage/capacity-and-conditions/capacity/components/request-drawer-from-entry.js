import RequestFromEntry from "./../../../../final-storage/setup/capacity-and-conditions/capacity/request-from-entry";

export default function RequestDrawerFromEntry({
  hasPendingContainersInHall,
  filteredPendingShippingInformations,
  requestQuantity,
  hallData,
}) {
  return (
    <>
      {hasPendingContainersInHall && (
        <div className="alert alert-warning flex  flex-col items-center justify-center text-center">
          <div className="flex flex-row space-x-2">
            <p>You have</p>
            <p className="font-semibold">
              {filteredPendingShippingInformations.length}
            </p>
            <p> new request(s) from Entry!</p>
          </div>
          {/* Side drawer for the requests */}
          <div className="drawer">
            <input id="my-drawer" type="checkbox" className="drawer-toggle" />
            <div className="drawer-content static">
              {/* Page content here */}
              <label
                htmlFor="my-drawer"
                className="btn btn-info drawer-button z-0 text-white"
              >
                Show Requests
                <span className="relative -top-6 left-6 right-6 flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex h-4 w-4 rounded-full bg-sky-500"></span>
                </span>
              </label>
            </div>
            <div className="drawer-side z-10">
              <label
                htmlFor="my-drawer"
                aria-label="close sidebar"
                className="drawer-overlay"
              ></label>
              <div className="menu min-h-full w-full md:w-1/2 bg-base-200 p-4 text-base-content">
                {/* Sidebar content here */}
                {requestQuantity.map((request) => (
                  <RequestFromEntry
                    key={request.id}
                    entryData={request}
                    hallData={hallData}
                  />
                ))}
                <div className="mt-10 flex justify-end">
                  <label
                    htmlFor="my-drawer"
                    className="btnCancel drawer-button w-32"
                  >
                    Close
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
