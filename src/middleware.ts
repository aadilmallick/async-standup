import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Manager surfaces require auth. Everything else (landing, public standup
// pages, QStash webhooks, public submit) stays open.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api/templates(.*)",
  "/api/sessions(.*)",
  "/api/schedules(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|gif|png|svg|ico|webp|woff2?|ttf|otf|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
