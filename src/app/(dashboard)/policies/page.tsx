import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export default function PoliciesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Policies"
        description="The rules the merchant owns. Saving a change creates a new version — never an overwrite."
      />
      <EmptyState hint="The policy editor and version history come online in the next build." />
    </div>
  );
}
