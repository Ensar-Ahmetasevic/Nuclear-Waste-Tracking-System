"use client";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { areas, manages, canAccess } from "../../lib/workspaces.cjs";
import ModalTruckDataForm from "../pages/shipping-informations/components/modals/modal-truck-data-form";
export default function Navbar() {
  const { data: session } = useSession();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [arrival, setArrival] = useState(false);
  const user = session?.user;
  if (!user || path === "/login" || path === "/register") return null;
  const manager = manages(user);
  const links = Object.entries(areas)
    .filter(([key]) => canAccess(user, key))
    .map(([, area]) => [area.href, `Step ${area.step} · ${area.title}`]);
  if (user.role === "ADMINISTRATOR")
    links.push(
      ["/container-profile", "Container definitions"],
      ["/pre-storage/setup", "Pre-storage setup"],
      ["/final-storage/setup", "Final-storage setup"],
    );
  if (manager) links.push(["/users", "Users"]);
  links.push(["/statistics", "Statistics"], ["/account", "My account"]);
  return (
    <>
      <nav className="border-b border-base-content/10 bg-base-100 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-lg font-bold">
            {manager ? "System overview" : "My workspace"}
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-base-content/65">
              {manager
                ? user.role === "ADMINISTRATOR"
                  ? "Administrator"
                  : "Supervision"
                : areas[user.workArea]
                  ? `Employee · Step ${areas[user.workArea].step}`
                  : "Employee · Unassigned"}
            </span>
            {canAccess(user, "SHIPPING") && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setArrival(true)}
              >
                Add arrival
              </button>
            )}
            <button
              className="btn btn-sm"
              aria-expanded={open}
              aria-controls="workspace-menu"
              onClick={() => setOpen(!open)}
            >
              Menu
            </button>
          </div>
        </div>
        {open && (
          <div
            id="workspace-menu"
            className="operational-panel mx-auto mt-4 flex max-w-6xl flex-wrap gap-2"
          >
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={path === href ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`btn btn-sm ${path === href ? "btn-primary" : "btn-ghost"}`}
              >
                {label}
              </Link>
            ))}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Sign out
            </button>
          </div>
        )}
      </nav>
      {arrival && (
        <ModalTruckDataForm
          closeModal={() => setArrival(false)}
          onSubmitForm={() => {
            setArrival(false);
            router.push("/shipping-informations");
          }}
        />
      )}
    </>
  );
}
