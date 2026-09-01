import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="At-risk value, verified recovery, and live agent activity for your merchant."
      />
      <EmptyState hint="KPIs, recovery trend, lane tiles, and the approvals queue come online in the next build." />
    </div>
  );
}
