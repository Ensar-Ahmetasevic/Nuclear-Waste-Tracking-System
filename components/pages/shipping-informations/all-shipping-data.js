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

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-8">
      <div className="overflow-x-auto">
        <table
          className={`table border-l-4 ${containerStatus === "rejected" ? "border-sky-400" : truck.truckStatus === "IN" ? "border-green-500" : "border-rose-500"}`}
        >
          <thead>
            <tr>
              <th></th>
              <th>Date</th>
              <th>Status</th>
              <th>Company Name</th>
              <th>DETAILS</th>
            </tr>
          </thead>
          <tbody>
            {/* row */}
            <tr>
              <th></th>
              <td>{dayjs(truck.entryDateTime).format("DD-MM-YYYY")}</td>
              <td>{truck.truckStatus}</td>
              <td>{truck.companyName}</td>
              <td>
                <Link
                  className={` ${
                    containerStatus === "rejected"
                      ? "btnInfo"
                      : truck.truckStatus === "IN"
                        ? "btnCreate"
                        : "btnDelete"
                  }`}
                  href={`/shipping-informations/${truck.id}`}
                  onClick={() => handleClick()}
                >
                  {isNavigating ? (
                    <LoadingSpinnerButton />
                  ) : containerStatus === "rejected" ? (
                    <>
                      <HiOutlineBellAlert className="h-6 w-6 animate-pulse" />
                      OPEN
                    </>
                  ) : truck.status === "pending" ? (
                    <>
                      <PiDotsThreeOutline /> OPEN
                    </>
                  ) : truck.status === "accepted" ? (
                    <>
                      <VscCheck /> OPEN
                    </>
                  ) : null}
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
