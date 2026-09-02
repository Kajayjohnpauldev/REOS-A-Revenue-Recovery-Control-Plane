import { NextResponse } from "next/server";
import { parseJson, ok, notFound } from "@/lib/api";
import { prisma } from "@/lib/db";
import { AllowlistSchema } from "@/lib/schemas";
import { getAgentDef } from "@/lib/agents/registry";
import { sessionWithPerm } from "@/lib/auth/current";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await sessionWithPerm("editAgents"))) {
    return NextResponse.json({ error: "Not permitted for your role" }, { status: 403 });
  }
  const { id } = await params;
  if (!getAgentDef(id)) return notFound("Unknown agent");

  const parsed = await parseJson(AllowlistSchema, request);
  if (!parsed.ok) return parsed.res;

  const allowlist = parsed.data.allowlist.join(",");
  const enabled = parsed.data.enabled ?? true;

  const config = await prisma.agentConfig.upsert({
    where: { agentKey: id },
    create: { agentKey: id, allowlist, enabled },
    update: { allowlist, enabled },
  });

  return ok({ config });
}
