"use client";
import Link from "next/link";
import { useT } from "../../shell/preferences";
import { useWorkspace } from "../../shared/use-workspace";
import ManagementOverview from "./management-overview";

// Administrator and Supervision see all three steps; employees are sent to
// their work area before this renders.
export default function Home() {
  const t = useT();
  const { user, assigned } = useWorkspace();
  if (!user) return null;
  if (!assigned)
    return (
      <main className="mx-auto max-w-xl space-y-4 p-8">
        <h1 className="text-2xl font-semibold">{t("home.unassigned.title")}</h1>
        <p>{t("home.unassigned.body")}</p>
        <Link className="btn min-h-11" href="/account">
          {t("nav.account")}
        </Link>
      </main>
    );
  return <ManagementOverview user={user} />;
}
