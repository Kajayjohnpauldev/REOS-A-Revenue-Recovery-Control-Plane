import { ok } from "@/lib/api";
import {
  computeAllMetrics,
  getLaneSummaries,
  getRecoveryTrend,
} from "@/lib/services/metrics";

export async function GET() {
  const [metrics, lanes, trend] = await Promise.all([
    computeAllMetrics(),
    getLaneSummaries(),
    getRecoveryTrend(),
  ]);
  return ok({ metrics, lanes, trend });
}
