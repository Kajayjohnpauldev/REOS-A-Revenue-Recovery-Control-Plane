import { ok } from "@/lib/api";
import {
  computeAllMetrics,
  getLaneSummaries,
  getRecoveryTrend,
  getRecentActivity,
} from "@/lib/services/metrics";

export async function GET() {
  const [metrics, lanes, trend, activity] = await Promise.all([
    computeAllMetrics(),
    getLaneSummaries(),
    getRecoveryTrend(),
    getRecentActivity(),
  ]);
  return ok({ metrics, lanes, trend, activity });
}
