import { NextResponse } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { env, hasGemini } from "@/lib/env";
import { sessionWithPerm } from "@/lib/auth/current";

export async function GET() {
  const [merchant, users] = await Promise.all([
    prisma.merchant.findFirst(),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, title: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return ok({
    merchant,
    users,
    connections: {
      gemini: hasGemini,
      payments: env.PAYMENTS_PROVIDER,
      ai: env.AI_PROVIDER,
    },
  });
}

const Body = z.object({ name: z.string().min(1).max(120) });

export async function POST(req: Request) {
  if (!(await sessionWithPerm("manageUsers"))) {
    return NextResponse.json({ error: "Not permitted for your role" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const merchant = await prisma.merchant.findFirst();
  if (merchant) {
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { name: parsed.data.name },
    });
  }
  return ok({ ok: true });
}
