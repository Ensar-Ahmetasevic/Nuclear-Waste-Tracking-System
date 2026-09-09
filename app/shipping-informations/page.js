"use client";

import { useState, useEffect } from "react";

import { useForm } from "react-hook-form";
import dayjs from "dayjs";

import AllShippingData from "./../../components/pages/shipping-informations/all-shipping-data";

import useShippingInformationQuery from "../../requests/request-shipping-information/use-fetch-shipping-informations-query";

import { FaSearch } from "react-icons/fa";
import LoadingSpinnerPage from "../../components/shared/loading-spiner-page";
import AlertWarning from "../../components/shared/alert-warning";

export default function ShippingInformations() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Initialize React Hook Form
  const { register, handleSubmit, watch } = useForm();
  const searchQuery = watch("searchQuery", "");

  // Move the query hook before any data processing
  const { data, isLoading, isError } = useShippingInformationQuery();

  // Define handlers
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handlePreviousPage = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prevPage) => Math.min(prevPage + 1, totalPages));
  };

  const onSubmit = (data) => {
    setCurrentPage(1);
  };

  // Effects
  useEffect(() => {
    scrollToTop();
  }, [currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Early returns for loading and error states
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinnerPage />
      </div>
    );
  }

  if (!data || isError) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <AlertWarning text={"Error loading shipping informations data"} />
      </div>
    );
  }

  const shippingDatas = data.shippingData || [];

  // Move data processing logic here
  const filteredData = shippingDatas.filter((truck) => {
    const filterByFullDate = dayjs(truck.entryDateTime).format("DD-MM-YYYY");
    const filterByYear = dayjs(truck.entryDateTime).format("YYYY");
    const filterByMonth = dayjs(truck.entryDateTime).format("MM");
    const filterByDay = dayjs(truck.entryDateTime).format("DD");

    const lowerCaseQuery = searchQuery.toLowerCase();

    if (lowerCaseQuery.startsWith("d")) {
      const dayQuery = lowerCaseQuery.slice(1);
      return filterByDay === dayQuery;
    } else if (lowerCaseQuery.startsWith("m")) {
      const monthQuery = lowerCaseQuery.slice(1);
      return filterByMonth === monthQuery;
    } else if (lowerCaseQuery.startsWith("y")) {
      const yearQuery = lowerCaseQuery.slice(1);
      return filterByYear === yearQuery;
    } else {
      return (
        truck.companyName.toLowerCase().includes(lowerCaseQuery) ||
        truck.truckStatus.toLowerCase() === lowerCaseQuery ||
        filterByFullDate === lowerCaseQuery
      );
    }
  });

  // Calculate pagination values
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const inStatusCount = shippingDatas.filter(
    (truck) => truck.truckStatus === "IN",
  ).length;

  return (
    <>
      <div className="flex justify-center px-4 pt-4 sm:pt-6">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="form-control w-full max-w-md space-y-3"
        >
          <div className="mx-auto space-x-2">
            <label htmlFor="searchShippings">Filter by:</label>
            <label className="font-semibold" htmlFor="searchShippings">
              Company Name, Date or Status
            </label>
          </div>
          <label className="input  input-primary flex items-center gap-2">
            <input
              className="grow"
              id="searchShippings"
              type="text"
              placeholder='e.g. "20-08-2024" or "D20" or "M08" or "Y2024"'
              {...register("searchQuery")}
            />
            <FaSearch />
          </label>
        </form>
      </div>

      <div className="divider mb-8 mt-16">All Shipping Informations</div>

      {/* Number of trucks with IN status */}
      <div className="flex justify-center px-4">
        <div className="stats stats-vertical w-full max-w-md shadow sm:stats-horizontal sm:w-auto">
          <div className="stat place-items-center">
            <div className="stat-title">Number of trucks</div>
            <div className="stat-value">{inStatusCount}</div>
          </div>

          <div className="stat place-items-center">
            <div className="stat-title">Status</div>
            <div className="stat-value text-green-500">IN</div>
          </div>
        </div>
      </div>

      <main className="container mx-auto mb-12 flex-col items-center">
        <div className="px-2 sm:px-6 lg:px-20">
          {filteredData.length === 0 ? (
            <div className="text-center text-gray-500">
              No data found matching your search criteria.
            </div>
          ) : (
            <>
              <ul>
                {currentItems.map((truck) => (
                  <li key={truck.id}>
                    <AllShippingData truck={truck} />
                  </li>
                ))}
              </ul>
              <div className="join mt-12 flex justify-center">
                <button
                  className="btn join-item"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  «
                </button>
                <button className="btn join-item" onClick={() => scrollToTop()}>
                  Page {currentPage} of {totalPages}
                </button>
                <button
                  className="btn join-item"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  »
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
