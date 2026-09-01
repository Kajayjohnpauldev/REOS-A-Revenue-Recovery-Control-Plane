import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export default function GuardrailsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Guardrails"
        description="What the agents refused to do — blocked tool calls, rejected messages, consent and budget stops."
      />
      <EmptyState hint="The 'What the agent refused to do' showpiece and per-agent panels come online in the next build." />
    </div>
  );
}
