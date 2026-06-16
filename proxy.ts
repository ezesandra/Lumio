import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/library/:path*",
    "/upload/:path*",
    "/settings/:path*",
    "/:path/quiz",
    "/:path/flashcards",
    "/:path/summary",
  ],
};
