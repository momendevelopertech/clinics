"use client";

import * as React from "react";

type RoleContextValue = {
  roles: string[];
  userId: string | null;
};

const RoleContext = React.createContext<RoleContextValue>({
  roles: [],
  userId: null,
});

export function RoleProvider({
  roles,
  userId,
  children,
}: {
  roles: string[];
  userId: string | null;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ roles, userId }), [roles, userId]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRoles() {
  return React.useContext(RoleContext);
}