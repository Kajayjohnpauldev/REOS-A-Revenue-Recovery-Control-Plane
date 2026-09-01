import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Case detail"
        description={`Decision log for case ${id}.`}
      />
      <EmptyState hint="The full decision log — event → reconcile → classification → action → outcome — comes online in the next build." />
    </div>
  );
}
