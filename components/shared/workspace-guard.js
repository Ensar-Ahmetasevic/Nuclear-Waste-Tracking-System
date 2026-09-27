"use client";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { pageAllowed } from "../../lib/workspaces.cjs";
import { useT } from "../shell/preferences";
import { PageLoader } from "../loading/loaders";
export default function WorkspaceGuard({ children }) {
  const t = useT();
  const { data, status } = useSession();
  const path = usePathname();
  if (
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/api/")
  )
    return children;
  if (status === "loading") return <PageLoader />;
  if (!data?.user)
    return (
      <div className="p-8">
        <p>{t("guard.signIn")}</p>
        <Link className="btn mt-4 min-h-11" href="/login">
          {t("login.submit")}
        </Link>
      </div>
    );
  if (!pageAllowed(data.user, path))
    return (
      <div className="mx-auto max-w-xl space-y-4 p-8">
        <h1 className="text-2xl font-semibold">{t("guard.outside")}</h1>
        <Link className="btn min-h-11 btn-primary" href="/">
          {t("nav.workspace")}
        </Link>
      </div>
    );
  return children;
}
