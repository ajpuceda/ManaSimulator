import { NextResponse } from "next/server";
import { ApiError } from "./http";
import { serviceStatus, missingServices } from "./env";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function handleError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[api] unexpected error:", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export function statusPayload() {
  return { services: serviceStatus(), missing: missingServices() };
}
