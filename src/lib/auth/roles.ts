/** Roles, the screens each can reach, and what each is allowed to do. Pure data
 *  — safe to import in both server and client code. */

export type Role = "admin" | "operator" | "analyst" | "auditor";

export const ROLES: Role[] = ["admin", "operator", "analyst", "auditor"];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  operator: "Recovery Operator",
  analyst: "Finance Analyst",
  auditor: "Auditor",
};

export const ROLE_TAGLINE: Record<Role, string> = {
  admin: "Full control — cases, policies, agents, and the team.",
  operator: "Work the queue — reconcile, approve, and recover.",
  analyst: "Follow the money — ledger, metrics, and exports.",
  auditor: "Read-only oversight — every decision, fully traceable.",
};

/** Nav routes visible to each role, in order. */
export const ROLE_NAV: Record<Role, string[]> = {
  admin: [
    "/overview",
    "/cases",
    "/approvals",
    "/guardrails",
    "/ledger",
    "/policies",
    "/agents",
    "/replay",
    "/metrics",
    "/settings",
  ],
  operator: ["/overview", "/cases", "/approvals", "/guardrails", "/agents", "/replay"],
  analyst: ["/overview", "/cases", "/ledger", "/metrics", "/replay"],
  auditor: ["/overview", "/cases", "/guardrails", "/ledger", "/agents", "/metrics"],
};

export const ROLE_HOME: Record<Role, string> = {
  admin: "/overview",
  operator: "/cases",
  analyst: "/metrics",
  auditor: "/overview",
};

export type Perms = {
  approveCases: boolean;
  editPolicy: boolean;
  manageUsers: boolean;
  ledgerTools: boolean;
  runReplay: boolean;
  editAgents: boolean;
};

export const ROLE_PERMS: Record<Role, Perms> = {
  admin: { approveCases: true, editPolicy: true, manageUsers: true, ledgerTools: true, runReplay: true, editAgents: true },
  operator: { approveCases: true, editPolicy: false, manageUsers: false, ledgerTools: false, runReplay: true, editAgents: false },
  analyst: { approveCases: false, editPolicy: false, manageUsers: false, ledgerTools: true, runReplay: true, editAgents: false },
  auditor: { approveCases: false, editPolicy: false, manageUsers: false, ledgerTools: false, runReplay: false, editAgents: false },
};

export function asRole(role: string): Role {
  return (ROLES as string[]).includes(role) ? (role as Role) : "operator";
}

export function canAccess(role: string, path: string): boolean {
  const nav = ROLE_NAV[asRole(role)];
  return nav.some((p) => path === p || path.startsWith(p + "/"));
}

export function permsFor(role: string): Perms {
  return ROLE_PERMS[asRole(role)];
}
