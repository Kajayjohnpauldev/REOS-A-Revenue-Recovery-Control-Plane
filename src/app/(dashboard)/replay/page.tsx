import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export default function ReplayPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Replay & Experiment Studio"
        description="Run a batch through the same production pipeline and watch the six scripted moments, live."
      />
      <EmptyState hint="The run studio, six-moment walkthrough, and treatment-vs-holdout toggle come online in the next build." />
    </div>
  );
}
