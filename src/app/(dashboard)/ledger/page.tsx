"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui-ext/StatusPill";
import { MoneyText } from "@/components/ui-ext/MoneyText";
import { NativeSelect } from "@/components/ui-ext/NativeSelect";
import { KpiCard } from "@/components/kpi/KpiCard";
import { useLedger, useSimulateRefund } from "@/lib/hooks";
import { usePerms } from "@/lib/auth/context";
import { formatDateTime, formatINR } from "@/lib/format";
import { LANES, LANE_LABELS } from "@/lib/types";
import type { LedgerEntryWithCase } from "@/lib/api-types";

function downloadCsv(entries: LedgerEntryWithCase[]) {
  const header = ["id", "type", "amount", "note", "createdAt", "lane", "entityId"];
  const rows = entries.map((e) =>
    [e.id, e.type, e.amount, `"${e.note.replace(/"/g, '""')}"`, e.createdAt, e.case.lane, e.case.entityId].join(","),
  );
  const csv = [header.join(","), ...rows].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "revivalos-ledger.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function LedgerPage() {
  const [lane, setLane] = useState("all");
  const [type, setType] = useState("all");
  const search = new URLSearchParams();
  if (lane !== "all") search.set("lane", lane);
  if (type !== "all") search.set("type", type);

  const { data, isLoading } = useLedger(search.toString());
  const refund = useSimulateRefund();
  const perms = usePerms();

  const entries = data?.entries ?? [];
  const totals = data?.totals;

  const simulate = async () => {
    try {
      const res = await refund.mutateAsync(undefined);
      toast.success(`Refund of ${formatINR(res.amount)} landed — net auto-subtracted to ${formatINR(res.totals.net)}`);
    } catch {
      toast.error("No recovered case available to refund");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ledger"
        description="The immutable, append-only record of every money event. Refunds subtract back out."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => downloadCsv(entries)}>
              <Download className="size-4" /> Export CSV
            </Button>
            {perms.ledgerTools && (
              <Button size="sm" onClick={simulate} disabled={refund.isPending}>
                <RotateCcw className="size-4" /> Simulate refund
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Gross recovered" value={totals ? formatINR(totals.gross) : "—"} variant="recovered" caption="sum of positive entries" />
        <KpiCard label="Refunds" value={totals ? formatINR(totals.refunds) : "—"} variant="risk" caption="subtracted back out" />
        <KpiCard label="Net recovered" value={totals ? formatINR(totals.net) : "—"} variant="net" caption="gross − refunds" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect
          ariaLabel="Lane"
          value={lane}
          onChange={setLane}
          className="w-44"
          options={[{ value: "all", label: "All lanes" }, ...LANES.map((l) => ({ value: l, label: LANE_LABELS[l] }))]}
        />
        <NativeSelect
          ariaLabel="Type"
          value={type}
          onChange={setType}
          className="w-40"
          options={[
            { value: "all", label: "All types" },
            { value: "recovery", label: "Recovery" },
            { value: "refund", label: "Refund" },
          ]}
        />
        <span className="ml-auto text-xs text-muted-foreground">{entries.length} entries</span>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">Type</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
              <th className="px-4 py-2.5 text-left font-medium">Note</th>
              <th className="px-4 py-2.5 text-left font-medium">Case</th>
              <th className="px-4 py-2.5 text-left font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-4">
                  <Skeleton className="h-24 w-full" />
                </td>
              </tr>
            ) : entries.length ? (
              entries.map((e) => (
                <tr key={e.id} className="border-b transition-colors last:border-0 hover:bg-accent/30">
                  <td className="px-4 py-2.5">
                    <StatusPill status={e.amount < 0 ? "refunded" : "recovered"} label={e.type} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <MoneyText value={e.amount} variant={e.amount < 0 ? "risk" : "recovered"} />
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{e.note}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/cases/${e.caseId}`} className="hover:underline">
                      <span className="text-sm">{e.case.customerName || e.case.entityId}</span>
                      <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                        {e.case.entityId}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No ledger entries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
