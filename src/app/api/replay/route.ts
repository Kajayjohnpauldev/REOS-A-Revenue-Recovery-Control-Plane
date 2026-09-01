import { ok } from "@/lib/api";
import { ReplaySchema } from "@/lib/schemas";
import { runReplay } from "@/lib/services/replay";

export async function POST(request: Request) {
  // Body is optional; default to an empty config.
  const bodyText = await request.text();
  let opts = {};
  if (bodyText.trim()) {
    const parsed = ReplaySchema.safeParse(JSON.parse(bodyText));
    if (!parsed.success) {
      return ok({ error: "Invalid replay config", issues: parsed.error.issues }, { status: 400 });
    }
    opts = parsed.data;
  }
  const result = await runReplay(opts);
  return ok(result);
}
