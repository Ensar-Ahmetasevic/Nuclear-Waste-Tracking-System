import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../auth";
import { canAccess } from "../workspaces.cjs";
export async function requireWorkspace(area, adminOnly = false) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (
    adminOnly
      ? session.user.role !== "ADMINISTRATOR"
      : !canAccess(session.user, area)
  )
    redirect("/");
}
