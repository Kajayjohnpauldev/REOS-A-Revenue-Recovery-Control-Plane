import { notFound } from "@/lib/api";
import { exportCasesJson, exportCasesCsv } from "@/lib/services/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;

  if (kind === "json") {
    const cases = await exportCasesJson();
    return new Response(JSON.stringify({ cases }, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="revivalos-audit.json"',
      },
    });
  }

  if (kind === "csv") {
    const csv = await exportCasesCsv();
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="revivalos-audit.csv"',
      },
    });
  }

  return notFound("Unknown export kind (use json or csv)");
}
