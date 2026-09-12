import { type NextRequest, NextResponse } from "next/server";
import { handleReceptionAction } from "@/lib/reception";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleReceptionAction(request, { params }, "check-in");
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}