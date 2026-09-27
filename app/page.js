import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../lib/auth";
import { areas, manages } from "../lib/workspaces.cjs";
import Home from "../components/pages/home/home";

// An employee's home is the page of the assigned work area.
export default async function Page() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (user && !manages(user) && areas[user.workArea])
    redirect(areas[user.workArea].href);
  return <Home />;
}
