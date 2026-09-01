import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Actions prepared by the agents, waiting for a human yes/no."
      />
      <EmptyState hint="The approvals work-queue and auto-approve config come online in the next build." />
    </div>
  );
}
