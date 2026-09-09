"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";

import LoadingSpinnerPage from "../components/shared/loading-spiner-page";

const fetchStats = async () => {
  const response = await axios.get("/api/stats");
  return response.data;
};

export default function HomePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: fetchStats,
  });

  return (
    <main className="min-h-screen bg-base-300">
      {/* Hero Section */}
      <section className="hero min-h-[30vh] bg-base-300 px-4 pb-0">
        <div className="hero-content text-center">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">
              Nuclear Waste Tracking System
            </h1>
            <p className="py-6 text-sm sm:text-base">
              Comprehensive solution for managing and monitoring nuclear waste
              throughout its lifecycle - from origin to final storage.
            </p>
          </div>
        </div>
      </section>

      {/* Safety Stats Section */}
      <section className="flex justify-center bg-base-300 px-4 pb-8 pt-0">
        {isLoading ? (
          <LoadingSpinnerPage />
        ) : isError ? (
          <p className="text-error">Failed to load statistics</p>
        ) : (
          <div className="stats stats-vertical w-full max-w-4xl shadow lg:stats-horizontal">
            <div className="stat place-items-center">
              <div className="stat-title">Active Containers</div>
              <div className="stat-value">{data?.activeContainers ?? 0}</div>
              <div className="stat-desc">
                Across pre-storage & final-storage
              </div>
            </div>

            <div className="stat place-items-center">
              <div className="stat-title">Storage Capacity Used</div>
              <div
                className={`stat-value ${
                  (data?.capacityUsedPercentage ?? 0) > 80
                    ? "text-error"
                    : "text-success"
                }`}
              >
                {data?.capacityUsedPercentage ?? 0}%
              </div>
              <div className="stat-desc">Of total storage surface area</div>
            </div>

            <div className="stat place-items-center">
              <div className="stat-title">Active Shipments</div>
              <div className="stat-value">{data?.activeShipments ?? 0}</div>
              <div className="stat-desc">Trucks with status IN</div>
            </div>
          </div>
        )}
      </section>

      {/* Key Features Grid */}
      <section className="flex justify-center p-4 sm:p-8">
        <div className="grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Waste Management */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Waste Management</h2>
              <p>
                Track different waste profiles, container types, and storage
                requirements
              </p>
              <div className="card-actions justify-end">
                <Link href="/container-profile" className="btn btn-primary">
                  Manage Waste
                </Link>
              </div>
            </div>
          </div>

          {/* Storage Monitoring */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Storage Monitoring</h2>
              <p>
                Monitor temperature, radiation, humidity and pressure in storage
                facilities
              </p>
              <div className="card-actions justify-end">
                <Link href="/pre-storage" className="btn btn-primary">
                  View Storage
                </Link>
              </div>
            </div>
          </div>

          {/* Transportation */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Transportation</h2>
              <p>Track shipping information and container movements</p>
              <div className="card-actions justify-end">
                <Link href="/shipping-informations" className="btn btn-primary">
                  Track Shipments
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
