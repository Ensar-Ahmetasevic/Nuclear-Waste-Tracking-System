"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { canAccess, manages } from "../../lib/workspaces.cjs";
import { activeItemKey, navigationFor } from "../../lib/navigation";
import { useWorkspace } from "../shared/use-workspace";
import ModalTruckDataForm from "../pages/shipping-informations/components/modals/modal-truck-data-form";
import Sidebar from "./sidebar";
import Topbar from "./topbar";
import BottomNav from "./bottom-nav";
import Launcher from "./launcher";

// Sidebar on tablets and desktops, bottom tab bar on phones, launcher everywhere.
export default function AppShell({ children }) {
  const { data: session } = useSession();
  const path = usePathname();
  const router = useRouter();
  const { query } = useWorkspace();
  // null, "search" (Ctrl K, top bar) or "menu" (phones).
  const [launcher, setLauncher] = useState(null);
  const [arrival, setArrival] = useState(false);
  const user = session?.user;
  const bare = !user || path === "/login" || path === "/register";
  const sections = useMemo(() => navigationFor(user), [user]);
  const active = activeItemKey(sections, path);
  const workspaces = query.data?.workspaces;
  // Bell: hall alerts in the storage areas this user may see. Supervision and
  // administrators count the ones they have not read yet; workers the open ones.
  const alertAreas = ["PRE_STORAGE", "FINAL_STORAGE"]
    .filter((area) => canAccess(user, area))
    .map((area) => workspaces?.find((row) => row.key === area)?.alerts || {});
  const count = manages(user) ? "unread" : "open";
  const alerts = {
    open: alertAreas.reduce((total, row) => total + (row[count] || 0), 0),
    critical: alertAreas.reduce((total, row) => total + (row.critical || 0), 0),
    href: alertAreas.length ? "/alerts" : null,
  };
  useEffect(() => {
    if (bare) return;
    const shortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setLauncher("search");
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [bare]);
  if (bare) return children;
  return (
    <div className="min-h-dvh md:flex">
      <Sidebar
        user={user}
        sections={sections}
        active={active}
        workspaces={workspaces}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          alerts={alerts}
          onOpenLauncher={() => setLauncher("search")}
          onRecordArrival={
            canAccess(user, "SHIPPING") ? () => setArrival(true) : null
          }
        />
        <div className="flex-1 pb-24 md:pb-0">{children}</div>
      </div>
      <BottomNav
        sections={sections}
        active={active}
        workspaces={workspaces}
        onOpenLauncher={() => setLauncher("menu")}
      />
      <Launcher
        open={Boolean(launcher)}
        mode={launcher || "search"}
        onClose={() => setLauncher(null)}
        user={user}
        sections={sections}
        workspaces={workspaces}
      />
      {arrival && (
        <ModalTruckDataForm
          closeModal={() => setArrival(false)}
          onSubmitForm={() => {
            setArrival(false);
            router.push("/shipping-informations");
          }}
        />
      )}
    </div>
  );
}
