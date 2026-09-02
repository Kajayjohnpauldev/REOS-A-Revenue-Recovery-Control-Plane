import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/current";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const decisions = await prisma.humanDecision.findMany({
    where: { userId: user.id },
    select: { decision: true, caseId: true },
  });
  const approvals = decisions.filter((d) => d.decision === "approve");
  const escalations = decisions.filter((d) => d.decision === "escalate").length;
  const approvedCaseIds = [...new Set(approvals.map((d) => d.caseId))];
  const approvedCases = approvedCaseIds.length
    ? await prisma.case.findMany({
        where: { id: { in: approvedCaseIds } },
        select: { recoveryAttribution: true },
      })
    : [];
  const recoveredValue = approvedCases.reduce((s, c) => s + c.recoveryAttribution, 0);

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      title: user.title,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
    stats: {
      decisionsMade: decisions.length,
      approvals: approvals.length,
      escalations,
      recoveredValue,
    },
  });
}

const Body = z.object({
  name: z.string().min(1).max(120).optional(),
  title: z.string().max(120).optional(),
  avatarUrl: z.string().max(1_400_000).optional(), // data URL, ~1MB image
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const data: Record<string, string> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.avatarUrl !== undefined) data.avatarUrl = parsed.data.avatarUrl;

  await prisma.user.update({ where: { id: session.uid }, data });
  return NextResponse.json({ ok: true });
}
