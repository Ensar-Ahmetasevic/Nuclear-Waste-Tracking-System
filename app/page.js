"use client";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import DataFreshness, {
  manualRefreshOptions,
} from "../components/shared/data-freshness";
import { areas, manages } from "../lib/workspaces.cjs";
export default function Home() {
  const { data: session } = useSession();
  const user = session?.user;
  const assigned = manages(user) || Boolean(areas[user?.workArea]);
  const query = useQuery({
    ...manualRefreshOptions,
    queryKey: ["workspace", user?.id, user?.workArea],
    enabled: Boolean(user) && assigned,
    queryFn: async () => {
      const response = await fetch("/api/workspace", {
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error("Unable to load workspace");
      return response.json();
    },
  });
  const { data, isLoading } = query;
  if (!assigned)
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-bold">Work area not assigned</h1>
        <p className="my-4">
          Ask your administrator to assign Step 1, Step 2 or Step 3 to your
          account.
        </p>
        <Link className="btn" href="/account">
          My account
        </Link>
      </main>
    );
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <p className="text-sm text-base-content/60">Welcome, {user?.name}</p>
        <h1 className="mt-2 text-3xl font-bold">
          {manages(user) ? "System overview" : areas[user.workArea].title}
        </h1>
        <p className="mt-2 text-base-content/70">
          {manages(user)
            ? "Choose a work area to review tasks and continue operations."
            : "Your work area, current workload and next actions."}
        </p>
      </header>
      {isLoading && <p role="status">Loading your workspace…</p>}
      <DataFreshness query={query} />
      {data?.workspaces.map((area) => (
        <section
          key={area.key}
          className="space-y-4 rounded-xl border border-base-content/15 bg-base-100 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-primary">Step {area.step}</p>
              <h2 className="text-xl font-semibold">{area.title}</h2>
              <p className="text-sm text-base-content/60">{area.description}</p>
            </div>
            <Link className="btn btn-primary" href={area.href}>
              Open{" "}
              {area.step === 1
                ? "shipments"
                : area.step === 2
                  ? "pre-storage"
                  : "final storage"}{" "}
              →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {area.metrics.map(([label, value, href]) => (
              <Link
                href={href || area.href}
                key={label}
                className="rounded-lg bg-base-200 p-4"
              >
                <span className="block text-sm text-base-content/70">
                  {label}
                </span>
                <span className="text-3xl font-bold">{value}</span>
              </Link>
            ))}
          </div>
          <h3 className="font-semibold">
            {area.step === 1
              ? "Needs content"
              : area.step === 2
                ? "Receiving halls"
                : "Storage rooms"}
          </h3>
          {area.tasks.length ? (
            <ul className="divide-y divide-base-content/10">
              {area.tasks.map((task) => (
                <li key={task.id}>
                  <Link
                    href={task.href}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <span>
                      <span className="block font-medium">{task.label}</span>
                      <span className="text-sm text-base-content/60">
                        {task.detail}
                      </span>
                    </span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-base-content/60">
              {area.step === 1
                ? "No shipments waiting for content."
                : "No locations configured. Contact your administrator."}
            </p>
          )}
          {area.step !== 1 && (
            <div className="flex flex-wrap gap-3 border-t border-base-content/10 pt-4">
              <Link
                className="btn btn-outline btn-sm"
                href={`${area.href}/history`}
              >
                Records & history
              </Link>
              <Link
                className="btn btn-outline btn-sm"
                href={`${area.href}/alerts`}
              >
                Conditions overview
              </Link>
            </div>
          )}
        </section>
      ))}
    </main>
  );
}
