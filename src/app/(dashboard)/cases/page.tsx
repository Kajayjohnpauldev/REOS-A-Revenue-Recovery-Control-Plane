import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export default function CasesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cases"
        description="Every at-risk revenue event, reconciled against live state, with its proposed action."
      />
      <EmptyState hint="The dense, filterable case table and detail drawer come online in the next build." />
    </div>
  );
}
