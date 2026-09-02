import { NextResponse } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sessionWithPerm } from "@/lib/auth/current";

export async function GET() {
  const [merchant, users] = await Promise.all([
    prisma.merchant.findFirst(),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, title: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const geminiFromEnv = !!env.GEMINI_API_KEY;
  const geminiFromDb = !!merchant?.geminiApiKey;
  return ok({
    merchant: merchant
      ? { id: merchant.id, name: merchant.name, environment: merchant.environment }
      : null,
    users,
    connections: {
      gemini: geminiFromEnv || geminiFromDb,
      geminiSource: geminiFromEnv ? "env" : geminiFromDb ? "settings" : "none",
      payments: env.PAYMENTS_PROVIDER,
      ai: env.AI_PROVIDER,
    },
  });
}

const Body = z.object({
  name: z.string().min(1).max(120).optional(),
  geminiApiKey: z.string().max(400).optional(), // empty string disconnects
});

export async function POST(req: Request) {
  if (!(await sessionWithPerm("manageUsers"))) {
    return NextResponse.json({ error: "Not permitted for your role" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const merchant = await prisma.merchant.findFirst();
  if (!merchant) {
    return NextResponse.json({ error: "No workspace found" }, { status: 400 });
  }

  const data: { name?: string; geminiApiKey?: string } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.geminiApiKey !== undefined)
    data.geminiApiKey = parsed.data.geminiApiKey.trim();

  await prisma.merchant.update({ where: { id: merchant.id }, data });
  return ok({ ok: true });
}
