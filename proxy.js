import { withAuth } from "next-auth/middleware";
const requireSession = withAuth({ pages: { signIn: "/login" } });
export default function proxy(request, event) {
  return requireSession(request, event);
}

export const config = {
  matcher: [
    "/",
    "/shipping-informations/:path*",
    "/container-profile/:path*",
    "/pre-storage/:path*",
    "/final-storage/:path*",
    "/statistics/:path*",
  ],
};
