import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/auth/session";
import { ROLE_HOME, asRole } from "@/lib/auth/roles";

export const runtime = "nodejs";

const Body = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { identifier, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier.toLowerCase() }, { name: identifier }],
    },
  });
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signSession({ uid: user.id, role: user.role, name: user.name });
  const res = NextResponse.json({
    ok: true,
    home: ROLE_HOME[asRole(user.role)],
    role: user.role,
    name: user.name,
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
