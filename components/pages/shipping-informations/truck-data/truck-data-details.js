import dayjs from "dayjs";

export default function TruckDataDetails({ data }) {
  if (!data || !data.shippingData) {
    return <div>{"No data available"}</div>;
  }

  // Destructure the necessary data
  const {
    entryDateTime,
    exitDateTime,
    companyName,
    driverName,
    registrationPlates,
    containerProfiles,
  } = data?.shippingData;

  // Calculate the sum of all quantities
  const sumQuantity = containerProfiles?.reduce((acc, containers) => {
    return acc + containers.quantity;
  }, 0);

  return (
    <div className="flex flex-col space-y-3 rounded-lg border-2 p-3 xl:flex-row xl:space-y-0">
      {/* Quantity, Entry and Exit Date */}
      <div className="stats stats-vertical shadow">
        <div className="stat">
          <div className="stat-title">Total number of containers</div>
          <div className="stat-value text-2xl">{sumQuantity}</div>
        </div>

        <div className="stat">
          <div className="stat-title">Entry date</div>
          <div className="stat-value text-2xl">
            {dayjs(entryDateTime).format("DD/MM/YYYY, HH:mm")}
          </div>
        </div>

        <div className="stat">
          <div className="stat-title">Exit date</div>
          <div className="stat-value text-2xl">
            {" "}
            {exitDateTime
              ? dayjs(exitDateTime).format("DD/MM/YYYY, HH:mm")
              : "-- / -- / ----"}
          </div>
        </div>
      </div>

      {/* Company, Driver and Registraion */}

      <div className="stats stats-vertical shadow">
        <div className="stat">
          <div className="stat-title">Registrations palets</div>
          <div className="stat-value text-2xl">{registrationPlates}</div>
        </div>

        <div className="stat">
          <div className="stat-title">Driver name</div>
          <div className="stat-value text-2xl">{driverName}</div>
        </div>

        <div className="stat">
          <div className="stat-title">Company name</div>
          <div className="stat-value text-2xl">{companyName}</div>
        </div>
      </div>
    </div>
  );
}
