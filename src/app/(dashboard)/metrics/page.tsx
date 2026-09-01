import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export default function MetricsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Metrics"
        description="The scoreboard and the receipts — all ten measures, with a one-click audit export."
      />
      <EmptyState hint="The ten metric charts, table, and audit export come online in the next build." />
    </div>
  );
}
