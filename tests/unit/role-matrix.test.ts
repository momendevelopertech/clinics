import { describe, expect, it } from "vitest";
import { staffRoleAssignmentSchema } from "@/lib/validations";

describe("staff role matrix", () => {
  it("requires tenant-safe user and role identifiers", () => {
    expect(staffRoleAssignmentSchema.safeParse({ userId: "user-1", roleId: "role-1" }).success).toBe(true);
    expect(staffRoleAssignmentSchema.safeParse({ userId: "", roleId: "role-1" }).success).toBe(false);
  });
});
