"use client";
import { PageLoader } from "../components/loading/loaders";

// Shown at once when a route is opened, until its content has streamed in.
export default function Loading() {
  return <PageLoader />;
}
