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

  const items = [
    { label: "Total number of containers", value: sumQuantity },
    {
      label: "Entry date",
      value: dayjs(entryDateTime).format("DD/MM/YYYY, HH:mm"),
    },
    {
      label: "Exit date",
      value: exitDateTime
        ? dayjs(exitDateTime).format("DD/MM/YYYY, HH:mm")
        : "-- / -- / ----",
    },
    { label: "Registrations palets", value: registrationPlates },
    { label: "Driver name", value: driverName },
    { label: "Company name", value: companyName },
  ];

  return (
    <div className="rounded-lg border-2 p-3 sm:p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-base-content/60 lg:sr-only">
        Transport summary
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-md bg-base-200 p-3 shadow-xs"
          >
            <div className="text-sm text-base-content/60">{item.label}</div>
            <div className="break-words text-base font-semibold sm:text-lg md:text-xl">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
