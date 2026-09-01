import { parseQuery, ok } from "@/lib/api";
import { CasesQuerySchema } from "@/lib/schemas";
import { listCases } from "@/lib/services/caseQueries";

export async function GET(request: Request) {
  const parsed = parseQuery(CasesQuerySchema, request.url);
  if (!parsed.ok) return parsed.res;
  const cases = await listCases(parsed.data);
  return ok({ cases, total: cases.length });
}
