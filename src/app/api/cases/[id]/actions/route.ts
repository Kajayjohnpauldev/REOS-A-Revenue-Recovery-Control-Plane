import { parseJson, ok, notFound } from "@/lib/api";
import { ActionSchema } from "@/lib/schemas";
import { applyAction } from "@/lib/services/caseActions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
