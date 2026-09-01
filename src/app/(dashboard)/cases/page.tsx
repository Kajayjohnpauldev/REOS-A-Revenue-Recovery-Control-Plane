import { Suspense } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { CasesTable } from "./CasesTable";

export default function CasesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cases"
        description="Every at-risk revenue event, reconciled against live state, with its proposed action."
      />
      <Suspense fallback={null}>
        <CasesTable />
      </Suspense>
    </div>
  );
}
