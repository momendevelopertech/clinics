import { NextResponse } from "next/server";
import { getCurrentUserId, hasAnyPermission } from "@/lib/auth";

export type RequiredPermission = {
  action: string;
  resource?: string;
};

export function permissionDeniedResponse() {
  return NextResponse.json(
    { error: "You don't have permission to perform this action." },
    { status: 403 },
  );
}

export async function requireAnyPermission(
  orgId: string,
  permissions: RequiredPermission[],
) {
  const userId = await getCurrentUserId(orgId);
  const isAllowed = await hasAnyPermission(userId, orgId, permissions);

  if (!isAllowed) {
    return {
      userId,
      response: permissionDeniedResponse(),
    };
  }

  return { userId, response: null };
}
