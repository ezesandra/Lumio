import { withAuth } from "next-auth/middleware";

import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isOnboarding = req.nextUrl.pathname.startsWith("/onboarding");
    
    // If authenticated but onboarding is not completed, redirect to onboarding
    // unless they are already on the onboarding page
    if (isAuth && token && !token.onboardingCompleted && !isOnboarding) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  },
  {
    pages: { signIn: "/login" },
  }
);

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
