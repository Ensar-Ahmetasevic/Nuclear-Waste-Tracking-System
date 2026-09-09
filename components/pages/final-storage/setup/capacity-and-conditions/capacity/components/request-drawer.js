import RequestFromEntry from "./../../../../../pre-storage/capacity-and-conditions/capacity/request-from-entry";
import dayjs from "dayjs";

export default function RequestDrawer({
  hasActiveStorageTransferRequests,
  roomData,
  requestQuantity,
}) {
  const lastRequest = roomData.storageTransferRequests.at(-1);

  const lastRequestDate = dayjs(lastRequest.createdAt).format("DD.MM.YYYY");
  const lastRequestTime = dayjs(lastRequest.createdAt).format("HH:mm");
  const lastRequestStatus = lastRequest.finalStorageStatus;
  const { name: lastRequestEmployeeName, surname: lastRequestEmployeeSurname } =
    lastRequest.requestedByEmployee;

  return (
    <>
      {hasActiveStorageTransferRequests && (
        <div className="alert alert-warning flex  flex-col items-center justify-center text-center">
          <div className="flex w-full max-w-2xl flex-col space-y-4 p-4">
            <p className="text-xl font-bold text-gray-800">
              You have made a new transfer request!
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 text-gray-700">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Request sent</span>
                <p className="text-gray-600">{lastRequestDate}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold">at</span>
                <p className="text-gray-600">{lastRequestTime}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold">by</span>
                <p className="text-gray-600">
                  {lastRequestEmployeeName} {lastRequestEmployeeSurname}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">
                  Request status:
                </span>
                <p className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                  {lastRequestStatus === "requestPending" && "Request Pending"}
                  {lastRequestStatus === "transportPending" &&
                    "Transport Pending"}
                  {lastRequestStatus === "requestRejected" &&
                    "Request Rejected"}
                </p>
              </div>
            </div>

            <p className="mt-4 text-center text-sm text-gray-600">
              ** Active request must be completed before submitting new ones!
            </p>
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
              {
                <div className="menu min-h-full w-full md:w-1/2 bg-base-200 p-4 text-base-content">
                  {/* Sidebar content here */}
                  {requestQuantity.map((request) => (
                    <RequestFromEntry
                      key={request.id}
                      entryData={request}
                      roomData={roomData}
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
              }
            </div>
          </div>
        </div>
      )}
    </>
  );
}
