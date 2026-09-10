import { NextResponse } from "next/server";
import { livenessPayload } from "@/lib/health";

export const dynamic = "force-dynamic";

/** Liveness probe — process is up. Does not check dependencies. */
export async function GET() {
  return NextResponse.json(livenessPayload());
}
