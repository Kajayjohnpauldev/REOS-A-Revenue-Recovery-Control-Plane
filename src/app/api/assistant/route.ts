import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { askAssistant } from "@/lib/assistant";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const Body = z.object({
  message: z.string().min(1).max(2000),
  page: z.string().optional(),
});

async function geminiKey(): Promise<string> {
  if (env.GEMINI_API_KEY) return env.GEMINI_API_KEY;
  const merchant = await prisma.merchant.findFirst({ select: { geminiApiKey: true } });
  return merchant?.geminiApiKey ?? "";
}

export async function GET() {
  const key = await geminiKey();
  return NextResponse.json({ gemini: !!key });
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { message, page } = parsed.data;
  const result = await askAssistant(message, page, { apiKey: await geminiKey() });
  return NextResponse.json(result);
}
