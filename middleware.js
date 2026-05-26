export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/shipping-informations/:path*",
    "/container-profile/:path*",
    "/pre-storage/:path*",
    "/final-storage/:path*",
    "/statistics/:path*",
  ],
};
