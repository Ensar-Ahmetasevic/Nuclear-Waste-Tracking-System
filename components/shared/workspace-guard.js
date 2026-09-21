"use client";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { pageAllowed } from "../../lib/workspaces.cjs";
export default function WorkspaceGuard({ children }) {
  const { data, status } = useSession();
  const path = usePathname();
  if (
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/api/")
  )
    return children;
  if (status === "loading") return <p className="p-8">Loading workspace…</p>;
  if (!data?.user)
    return (
      <div className="p-8">
        <p>Please sign in to continue.</p>
        <Link className="btn mt-4" href="/login">
          Sign in
        </Link>
      </div>
    );
  if (!pageAllowed(data.user, path))
    return (
      <div className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-bold">
          This page is outside your work area
        </h1>
        <Link className="btn mt-4 btn-primary" href="/">
          My workspace
        </Link>
      </div>
    );
  return children;
}
