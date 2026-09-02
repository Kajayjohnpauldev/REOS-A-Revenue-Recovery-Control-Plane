import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { testGemini } from "@/lib/assistant";
import { sessionWithPerm } from "@/lib/auth/current";

export const runtime = "nodejs";

const Body = z.object({ apiKey: z.string().optional() });

export async function POST(req: Request) {
  if (!(await sessionWithPerm("manageUsers"))) {
    return NextResponse.json({ error: "Not permitted for your role" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  const typed = parsed.success ? parsed.data.apiKey?.trim() : "";

  let key = typed || env.GEMINI_API_KEY;
  if (!key) {
    const merchant = await prisma.merchant.findFirst({ select: { geminiApiKey: true } });
    key = merchant?.geminiApiKey ?? "";
  }
  if (!key) {
    return NextResponse.json({ ok: false, error: "No key configured yet." });
  }
  const result = await testGemini(key);
  return NextResponse.json(result);
}
