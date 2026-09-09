import RequestFromFinalStorage from "./inner-components/request-from-final-storage";

export default function RequestDrawerFromFinalStorage({
  hasPendingContainersFromFinalStorage,
  requestData,
}) {
  return (
    <>
      {hasPendingContainersFromFinalStorage && (
        <div className="alert alert-info flex flex-col items-center justify-center text-center">
          <div className="flex flex-row space-x-2">
            <p>You have new request from Final Storage!</p>
          </div>
          {/* Side drawer for the requests */}
          <div className="drawer">
            <input
              id="my-drawer-final-storage"
              type="checkbox"
              className="drawer-toggle"
            />
            <div className="drawer-content static">
              {/* Page content here */}
              <label
                htmlFor="my-drawer-final-storage"
                className="btn btn-warning drawer-button z-0 text-black"
              >
                Show Requests
                <span className="relative -top-6 left-6 right-6 flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-4 w-4 rounded-full bg-red-500"></span>
                </span>
              </label>
            </div>
            <div className="drawer-side z-10">
              <label
                htmlFor="my-drawer-final-storage"
                aria-label="close sidebar"
                className="drawer-overlay"
              ></label>
              <div className="menu min-h-full w-full md:w-1/2 bg-base-200 p-4 text-base-content">
                {/* Sidebar content here */}
                {requestData.map((request) => (
                  <RequestFromFinalStorage
                    key={request.id}
                    requestData={request}
                  />
                ))}

                <div className="mt-10 flex justify-end">
                  <label
                    htmlFor="my-drawer-final-storage"
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
