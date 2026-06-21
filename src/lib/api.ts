import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AccessError, AuthError, NotFoundError } from "@/lib/auth";

/** Converts thrown errors into consistent JSON responses for API routes. */
export function toErrorResponse(err: unknown): NextResponse {
  if (
    err instanceof AuthError ||
    err instanceof AccessError ||
    err instanceof NotFoundError
  ) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", issues: err.issues },
      { status: 422 }
    );
  }
  console.error("API error:", err);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
