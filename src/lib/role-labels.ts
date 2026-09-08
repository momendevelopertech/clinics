/** Care Coordinator remains the persisted RBAC role; Receptionist is its UI label. */
export function displayRoleName(role: string): string {
  return role === "Care Coordinator" ? "Receptionist" : role;
}
