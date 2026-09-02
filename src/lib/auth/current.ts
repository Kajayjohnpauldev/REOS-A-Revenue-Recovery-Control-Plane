import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, verifySession, type Session } from "./session";
import { permsFor, type Perms } from "./roles";

/** Read + verify the session cookie on the server (RSC / route handlers). */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export async function getCurrentUser() {
  const s = await getSession();
  if (!s) return null;
  return prisma.user.findUnique({ where: { id: s.uid } });
}

/** For route handlers: returns the session if it holds the permission, else null. */
export async function sessionWithPerm(
  perm: keyof Perms,
): Promise<Session | null> {
  const s = await getSession();
  if (!s) return null;
  return permsFor(s.role)[perm] ? s : null;
}
