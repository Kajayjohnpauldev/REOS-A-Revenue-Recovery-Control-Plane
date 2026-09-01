/** Fixed vivid palette that reads well in both light and dark themes. */
export const CHART = {
  recovered: "#22c55e",
  net: "#3b82f6",
  risk: "#f59e0b",
  refunds: "#ef4444",
  incremental: "#8b5cf6",
  accent: "#0b3d91",
  grid: "#8888881f",
  axis: "#9ca3af",
} as const;

export const LANE_COLORS: Record<string, string> = {
  payment_failure: "#3b82f6",
  abandoned_checkout: "#22c55e",
  failed_subscription: "#f59e0b",
  overdue_receivable: "#8b5cf6",
  dispute_refund: "#ef4444",
};
