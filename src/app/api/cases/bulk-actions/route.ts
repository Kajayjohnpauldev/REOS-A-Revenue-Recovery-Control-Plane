import { parseJson, ok } from "@/lib/api";
import { BulkActionSchema } from "@/lib/schemas";
import { applyAction } from "@/lib/services/caseActions";

export async function POST(request: Request) {
  const parsed = await parseJson(BulkActionSchema, request);
  if (!parsed.ok) return parsed.res;

  const { caseIds, action, note } = parsed.data;
  const results = [];
  for (const caseId of caseIds) {
    const r = await applyAction({ caseId, action, note });
    if (r) results.push(r);
  }
  return ok({
    applied: results.length,
    recovered: results.filter((r) => r.recovered).length,
    results,
  });
}
