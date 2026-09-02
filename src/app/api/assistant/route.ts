import { NextResponse } from "next/server";
import { z } from "zod";
import { askAssistant } from "@/lib/assistant";
import { hasGemini } from "@/lib/env";

export const runtime = "nodejs";

const Body = z.object({
  message: z.string().min(1).max(2000),
  page: z.string().optional(),
});

export async function GET() {
  return NextResponse.json({ gemini: hasGemini });
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { message, page } = parsed.data;
  const result = await askAssistant(message, page);
  return NextResponse.json(result);
}
