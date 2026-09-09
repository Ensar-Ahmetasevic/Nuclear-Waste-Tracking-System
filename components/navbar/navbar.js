"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

import Link from "next/link";

import useShippingInformationQuery from "./../../requests/request-shipping-information/use-fetch-shipping-informations-query";

import ModalTruckDataForm from "./../pages/shipping-informations/components/modals/modal-truck-data-form";
import LoadingSpinnerPage from "./../shared/loading-spiner-page";
import Indicator from "./../shared/indicator";
import AlertWarning from "../shared/alert-warning";

export default function Navbar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  const { data, isLoading, isError } = useShippingInformationQuery({
    enabled: isAuthenticated,
  });

  useEffect(() => {
    setIsNavigating(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Hide navbar on auth pages
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  // Minimal navbar when not authenticated
  if (!isAuthenticated) {
    return (
      <nav className="navbar flex-wrap gap-2 bg-base-100 px-4 sm:px-8 lg:px-12">
        <div className="flex-1">
          <Link className="btn btn-ghost text-base sm:text-xl" href="/">
            Home Page
          </Link>
        </div>
        <Link href="/login" className="btn btn-primary btn-sm sm:btn-md">
          Sign in
        </Link>
        <Link href="/register" className="btn btn-ghost btn-sm sm:btn-md">
          Register
        </Link>
      </nav>
    );
  }

  // Early returns for loading and error states
  if (isLoading) {
    return <LoadingSpinnerPage />;
  }

  if (!data || isError) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <AlertWarning text={"Error loading shipping informations data"} />
      </div>
    );
  }

  const handleClick = (destinationPath) => {
    // Only set navigating to true if we're not already on the destination path
    if (pathname !== destinationPath) {
      setIsNavigating(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };
  const openModal = () => {
    setIsModalOpen(true);
  };

  const onSubmitForm = (isSuccess) => {
    if (!isSuccess) {
      // Close the modal after form submission
      setIsModalOpen(false);
      router.push("/shipping-informations");
    }
  };

  // Check if `data` exists and has a `shippingData` array
  const hasRejectedStatus = data?.shippingData?.some((shipment) =>
    // Check if any `shipment` has `containerProfiles` and iterate over them
    shipment.containerProfiles?.some(
      // Check if any `profile` has `containerStatus` equal to "rejected"
      (profile) => profile.containerStatus === "rejected",
    ),
  );

  // Check if `data` exists and has a `shippingData` array
  const hasPendingStatus = data?.shippingData?.some((shipment) =>
    // Check if any `shipment` has `containerProfiles` and iterate over them
    shipment.containerProfiles?.some(
      // Check if any `profile` has `containerStatus` equal to "pending"
      (profile) => profile.containerStatus === "pending",
    ),
  );

  return (
    <>
      {/* Add Loading Overlay */}
      {isNavigating && <LoadingSpinnerPage />}

      <nav className="navbar gap-2 bg-base-100 px-4 sm:px-8 lg:space-x-3 lg:px-12">
        <div className="flex-1">
          <Link
            className="btn btn-ghost text-base sm:text-xl"
            href="/"
            onClick={() => handleClick("/")}
          >
            Home Page
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          aria-label="Open menu"
          className="btn btn-square btn-ghost lg:hidden"
          onClick={() => setIsMobileMenuOpen((v) => !v)}
        >
          {hasRejectedStatus || hasPendingStatus ? (
            <span className="absolute right-2 top-2 flex h-3 w-3">
              <Indicator
                color={hasRejectedStatus ? "bg-sky-500" : "bg-green-400"}
              />
            </span>
          ) : null}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {isMobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

        {/* Desktop dropdown nav */}
        <div className="hidden flex-row items-center gap-2 lg:flex">
          {/* Shipping Check-In */}
          <div className="dropdown dropdown-hover">
            <div
              tabIndex={0}
              role="button"
              className="btn flex w-full flex-row"
            >
              {/* Show Rejected Pointer */}
              {hasRejectedStatus ? (
                <span className="flex h-4 w-4">
                  <Indicator color="bg-sky-500" />
                </span>
              ) : null}

              <samp>Entry Check-In</samp>
            </div>
            <ul className="menu dropdown-content rounded-t-none bg-base-100 p-2 px-1">
              <li>
                <button onClick={() => openModal()}>Add New Entry</button>
              </li>
              <li>
                <Link
                  href="/shipping-informations"
                  onClick={() => handleClick("/shipping-informations")}
                >
                  {hasRejectedStatus ? (
                    <span className="flex h-4 w-4">
                      <Indicator color="bg-sky-500" />
                    </span>
                  ) : null}{" "}
                  View All
                </Link>
              </li>
              <li className="bg-base-200">
                <Link
                  href="/container-profile"
                  onClick={() => handleClick("/container-profile")}
                >
                  Container Profil Setup
                </Link>
              </li>
            </ul>
          </div>

          {/* Pre-Storage */}
          <div className="dropdown dropdown-hover">
            {/* Show Requests Pointer */}
            <div tabIndex={0} role="button" className="btn w-40">
              {hasPendingStatus ? (
                <span className="flex h-4 w-4">
                  <Indicator color="bg-green-400" />
                </span>
              ) : null}
              <span>Pre-storage</span>
            </div>

            <ul className="menu dropdown-content w-full rounded-t-none bg-base-100 p-2">
              <li>
                <Link
                  href="/pre-storage"
                  onClick={() => handleClick("/pre-storage")}
                >
                  {/* Show Requests Pointer */}
                  {hasPendingStatus ? (
                    <span className="flex h-4 w-4">
                      <Indicator color="bg-green-400" />
                    </span>
                  ) : null}
                  Capacity & Conditions
                </Link>
              </li>
              <li className="bg-base-200">
                <Link
                  href="/pre-storage/setup"
                  onClick={() => handleClick("/pre-storage/setup")}
                >
                  Pre-Storage Setup
                </Link>
              </li>
            </ul>
          </div>

          {/* Final-Storage */}
          <div className="dropdown dropdown-hover">
            {/* Show Requests Pointer */}
            <div tabIndex={0} role="button" className="btn w-40">
              {/*    {hasPendingStatus ? (
              <span className="flex h-4 w-4">
                <Indicator color="bg-green-400" />
              </span>
            ) : null} */}
              <span>Final-storage</span>
            </div>

            <ul className="menu dropdown-content w-full rounded-t-none bg-base-100 p-2">
              <li>
                <Link
                  href="/final-storage"
                  onClick={() => alert("Final-Storage Capacity & Conditions")}
                >
                  {/* Show Requests Pointer */}
                  {/*  {hasPendingStatus ? (
                  <span className="flex h-4 w-4">
                    <Indicator color="bg-green-400" />
                  </span>
                ) : null} */}
                  Capacity & Conditions
                </Link>
              </li>
              <li className="bg-base-200">
                <Link href="/final-storage/setup">Final-Storage Setup</Link>
              </li>
            </ul>
          </div>

          {/* Statistics */}
          <div className="dropdown dropdown-hover">
            <div tabIndex={0} role="button" className="btn w-40">
              Statistics
            </div>
            <ul className="menu dropdown-content rounded-t-none bg-base-100 p-2">
              <li>
                <button onClick={() => console.log("Add final-storage")}>
                  Add New
                </button>
              </li>
              <li>
                <Link
                  href="/statistics"
                  onClick={() => handleClick("/statistics")}
                >
                  View All
                </Link>
              </li>
            </ul>
          </div>

          {/* User menu */}
          <div className="dropdown dropdown-end dropdown-hover">
            <div tabIndex={0} role="button" className="btn">
              {session?.user?.name || session?.user?.email || "Account"}
            </div>
            <ul className="menu dropdown-content rounded-t-none bg-base-100 p-2">
              <li>
                <button onClick={() => signOut({ callbackUrl: "/login" })}>
                  Sign out
                </button>
              </li>
            </ul>
          </div>
          {/* End desktop dropdown nav */}
        </div>
      </nav>

      {/* Mobile drawer */}
      {isMobileMenuOpen && (
        <div className="border-b border-base-300 bg-base-100 shadow-lg lg:hidden">
          <ul className="menu menu-vertical w-full gap-1 p-4">
            <li>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openModal();
                }}
              >
                Add New Entry
              </button>
            </li>
            <li>
              <Link
                href="/shipping-informations"
                onClick={() => handleClick("/shipping-informations")}
              >
                {hasRejectedStatus ? (
                  <span className="flex h-4 w-4">
                    <Indicator color="bg-sky-500" />
                  </span>
                ) : null}
                Entry Check-In · View All
              </Link>
            </li>
            <li>
              <Link
                href="/container-profile"
                onClick={() => handleClick("/container-profile")}
              >
                Container Profile Setup
              </Link>
            </li>
            <div className="divider my-1" />
            <li>
              <Link
                href="/pre-storage"
                onClick={() => handleClick("/pre-storage")}
              >
                {hasPendingStatus ? (
                  <span className="flex h-4 w-4">
                    <Indicator color="bg-green-400" />
                  </span>
                ) : null}
                Pre-storage · Capacity & Conditions
              </Link>
            </li>
            <li>
              <Link
                href="/pre-storage/setup"
                onClick={() => handleClick("/pre-storage/setup")}
              >
                Pre-Storage Setup
              </Link>
            </li>
            <div className="divider my-1" />
            <li>
              <Link href="/final-storage">
                Final-storage · Capacity & Conditions
              </Link>
            </li>
            <li>
              <Link href="/final-storage/setup">Final-Storage Setup</Link>
            </li>
            <div className="divider my-1" />
            <li>
              <Link
                href="/statistics"
                onClick={() => handleClick("/statistics")}
              >
                Statistics
              </Link>
            </li>
            <div className="divider my-1" />
            <li className="text-sm opacity-70">
              <span>
                {session?.user?.name || session?.user?.email || "Account"}
              </span>
            </li>
            <li>
              <button onClick={() => signOut({ callbackUrl: "/login" })}>
                Sign out
              </button>
            </li>
          </ul>
        </div>
      )}

      {isModalOpen ? (
        <ModalTruckDataForm
          closeModal={closeModal}
          onSubmitForm={onSubmitForm}
        />
      ) : null}
    </>
  );
}
