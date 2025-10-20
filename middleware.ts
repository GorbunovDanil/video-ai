export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/image-ad/:path*",
    "/video-ad/:path*",
    "/gallery/:path*",
    "/account/:path*",
    "/pricing/:path*",
    "/api/image/:path*",
    "/api/video/:path*",
    "/api/projects/:path*",
    "/api/stripe/(checkout|portal)/:path*",
  ],
};
