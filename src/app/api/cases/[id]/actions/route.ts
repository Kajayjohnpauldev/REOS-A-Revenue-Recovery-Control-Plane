import { NextResponse } from "next/server";
import { parseJson, ok, notFound } from "@/lib/api";
import { ActionSchema } from "@/lib/schemas";
import { applyAction } from "@/lib/services/caseActions";
import { sessionWithPerm } from "@/lib/auth/current";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await sessionWithPerm("approveCases"))) {
    return NextResponse.json({ error: "Not permitted for your role" }, { status: 403 });
  }
  const { id } = await params;
  const parsed = await parseJson(ActionSchema, request);
  if (!parsed.ok) return parsed.res;

  const result = await applyAction({
    caseId: id,
    action: parsed.data.action,
    note: parsed.data.note,
  });
  if (!result) return notFound("Case not found");
  return ok(result);
}
