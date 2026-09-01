import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents"
        description="Seven roles — three use the LLM, three are deterministic — each with a fixed tool allowlist and an abstention rule."
      />
      <EmptyState hint="Per-agent cards with editable allowlists and recent decisions come online in the next build." />
    </div>
  );
}
