"use client";

import { createContext, useContext, type ReactNode } from "react";
import { permsFor, type Perms, type Role } from "./roles";

export type SessionUser = {
  uid: string;
  name: string;
  email: string;
  role: Role;
  title: string | null;
  avatarUrl: string;
};

const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({
  value,
  children,
}: {
  value: SessionUser;
  children: ReactNode;
}) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionUser {
  const v = useContext(SessionContext);
  if (!v) throw new Error("useSession must be used within a SessionProvider");
  return v;
}

export function usePerms(): Perms {
  return permsFor(useSession().role);
}
