import { withAuth } from "next-auth/middleware";

export default withAuth({ pages: { signIn: "/login" } });

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/library/:path*",
    "/progress/:path*",
    "/settings/:path*",
    "/study-plan/:path*",
    "/subscription/:path*",
    "/upload/:path*",
    "/:path/quiz",
    "/:path/flashcards",
    "/:path/summary",
  ],
};
