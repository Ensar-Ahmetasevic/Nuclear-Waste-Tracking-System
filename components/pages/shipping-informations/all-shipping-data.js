import { useState } from "react";

import Link from "next/link";
import dayjs from "dayjs";
import LoadingSpinnerButton from "./../../shared/loading-spiner-button";

import { PiDotsThreeOutline } from "react-icons/pi";
import { HiOutlineBellAlert } from "react-icons/hi2";
import { VscCheck } from "react-icons/vsc";

export default function AllShippingData({ truck }) {
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = () => {
    setIsNavigating(true);
  };

  const containerStatus = truck.containerProfiles.some(
    (container) => container.containerStatus === "rejected",
  )
    ? "rejected"
    : "accepted";

  const borderColor =
    containerStatus === "rejected"
      ? "border-sky-400"
      : truck.truckStatus === "IN"
        ? "border-green-500"
        : "border-rose-500";

  const actionClass =
    containerStatus === "rejected"
      ? "btnInfo"
      : truck.truckStatus === "IN"
        ? "btnCreate"
        : "btnDelete";

  const actionContent = isNavigating ? (
    <LoadingSpinnerButton />
  ) : containerStatus === "rejected" ? (
    <>
      <HiOutlineBellAlert className="h-5 w-5 animate-pulse" />
      OPEN
    </>
  ) : truck.status === "pending" ? (
    <>
      <PiDotsThreeOutline className="h-5 w-5" />
      OPEN
    </>
  ) : truck.status === "accepted" ? (
    <>
      <VscCheck className="h-5 w-5" />
      OPEN
    </>
  ) : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-2 pt-6 sm:px-4 md:pt-8">
      <article
        className={`rounded-lg border border-l-4 border-base-300 bg-base-100 p-4 shadow-sm md:hidden ${borderColor}`}
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-base-content/60">
                Company Name
              </p>
              <p className="mt-1 break-words text-base font-semibold">
                {truck.companyName}
              </p>
            </div>
            <span
              className={`badge badge-outline shrink-0 font-semibold ${
                truck.truckStatus === "IN"
                  ? "border-green-500 text-green-500"
                  : "border-rose-500 text-rose-500"
              }`}
            >
              {truck.truckStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-base-content/60">
                Date
              </p>
              <p className="mt-1 font-medium">
                {dayjs(truck.entryDateTime).format("DD-MM-YYYY")}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-base-content/60">
                Details
              </p>
              <Link
                className={`${actionClass} mt-1 min-h-10 w-full gap-2`}
                href={`/shipping-informations/${truck.id}`}
                onClick={() => handleClick()}
              >
                {actionContent}
              </Link>
            </div>
          </div>
        </div>
      </article>

      <div className="hidden md:block">
        <table className={`table w-full table-fixed border-l-4 ${borderColor}`}>
          <thead>
            <tr>
              <th className="w-6"></th>
              <th>Date</th>
              <th>Status</th>
              <th>Company Name</th>
              <th className="w-32">DETAILS</th>
            </tr>
          </thead>
          <tbody>
            {/* row */}
            <tr>
              <th></th>
              <td>{dayjs(truck.entryDateTime).format("DD-MM-YYYY")}</td>
              <td>{truck.truckStatus}</td>
              <td className="break-words">{truck.companyName}</td>
              <td>
                <Link
                  className={`${actionClass} gap-2`}
                  href={`/shipping-informations/${truck.id}`}
                  onClick={() => handleClick()}
                >
                  {actionContent}
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
