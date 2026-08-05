import { NextResponse } from "next/server";

// Lightweight liveness check for Docker/nginx healthchecks — deliberately
// does not touch Prisma/Postgres so a slow DB never flaps the app container's
// health status; DB reachability is exercised by every real page/API request.
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
