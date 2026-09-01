import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export default function LedgerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ledger"
        description="The immutable, append-only record of every money event. Refunds subtract back out."
      />
      <EmptyState hint="The append-only ledger table, running totals, and refund simulation come online in the next build." />
    </div>
  );
}
