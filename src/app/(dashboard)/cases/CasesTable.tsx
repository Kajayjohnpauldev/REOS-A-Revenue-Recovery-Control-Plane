"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { StatusPill } from "@/components/ui-ext/StatusPill";
import { MoneyText } from "@/components/ui-ext/MoneyText";
import { NativeSelect } from "@/components/ui-ext/NativeSelect";
import { Skeleton } from "@/components/ui/skeleton";
import { useCases, useBulkAction } from "@/lib/hooks";
import { usePerms } from "@/lib/auth/context";
import type { CaseWithHoldout } from "@/lib/api-types";
import { formatAge, titleCase } from "@/lib/format";
import { LANES, LANE_LABELS, type LaneName } from "@/lib/types";

const BANDS: Record<string, { min?: number; max?: number }> = {
  all: {},
  lt1k: { max: 999 },
  "1k-10k": { min: 1000, max: 10000 },
  "10k-50k": { min: 10000, max: 50000 },
  gt50k: { min: 50001 },
};

function Sortable({
  column,
  children,
}: {
  column: { toggleSorting: (d?: boolean) => void; getIsSorted: () => false | "asc" | "desc" };
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-1 hover:text-foreground"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {children}
      <ArrowUpDown className="size-3 opacity-60" />
    </button>
  );
}

export function CasesTable() {
  const sp = useSearchParams();
  const [lane, setLane] = useState(sp.get("lane") ?? "all");
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [band, setBand] = useState("all");
  const [consent, setConsent] = useState("all");
  const [needsApproval, setNeedsApproval] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "amount", desc: true }]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [drawer, setDrawer] = useState<CaseWithHoldout | null>(null);

  useEffect(() => {
    setLane(sp.get("lane") ?? "all");
    setQ(sp.get("q") ?? "");
  }, [sp]);

  const search = useMemo(() => {
    const p = new URLSearchParams();
    if (lane !== "all") p.set("lane", lane);
    if (consent !== "all") p.set("consentState", consent);
    if (needsApproval === "true") p.set("needsApproval", "true");
    const b = BANDS[band];
    if (b.min != null) p.set("minAmount", String(b.min));
    if (b.max != null) p.set("maxAmount", String(b.max));
    if (q.trim()) p.set("q", q.trim());
    return p.toString();
  }, [lane, consent, needsApproval, band, q]);

  const { data, isLoading } = useCases(search);
  const cases = data?.cases ?? [];
  const bulk = useBulkAction();
  const perms = usePerms();

  const columns = useMemo<ColumnDef<CaseWithHoldout>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all"
            checked={table.getIsAllRowsSelected()}
            onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)}
          />
        ),
        cell: ({ row }) => (
          <span onClick={(e) => e.stopPropagation()}>
            <Checkbox
              aria-label="Select row"
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(!!v)}
            />
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "customerName",
        header: "Customer",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {row.original.customerName || row.original.entityId}
            </p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {row.original.entityId} ·{" "}
              {row.original.holdout?.group === "holdout" ? "holdout" : "treatment"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "lane",
        header: "Lane",
        cell: ({ getValue }) => (
          <span className="text-xs">
            {LANE_LABELS[getValue<string>() as LaneName] ?? getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: ({ column }) => <Sortable column={column}>Amount</Sortable>,
        cell: ({ getValue }) => <MoneyText value={getValue<number>()} />,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <Sortable column={column}>Age</Sortable>,
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">{formatAge(getValue<string>())}</span>
        ),
      },
      {
        accessorKey: "failureClass",
        header: "Failure",
        cell: ({ getValue }) => (
          <span className="text-xs">{titleCase(getValue<string>() ?? "—")}</span>
        ),
      },
      {
        accessorKey: "currentState",
        header: "State (verified)",
        cell: ({ getValue }) => <StatusPill status={getValue<string>()} />,
      },
      {
        accessorKey: "proposedAction",
        header: "Proposed action",
        cell: ({ getValue }) => (
          <span className="text-xs">{titleCase(getValue<string>() ?? "—")}</span>
        ),
      },
      {
        accessorKey: "confidence",
        header: ({ column }) => <Sortable column={column}>Conf.</Sortable>,
        cell: ({ getValue }) => {
          const c = getValue<number | null>() ?? 0;
          return (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-10 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${Math.round(c * 100)}%` }} />
              </div>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {Math.round(c * 100)}%
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "approvalState",
        header: "Approval",
        cell: ({ getValue }) => <StatusPill status={getValue<string>()} />,
      },
    ],
    [],
  );

  const visibleColumns = useMemo(
    () => (perms.approveCases ? columns : columns.filter((c) => c.id !== "select")),
    [columns, perms.approveCases],
  );

  const table = useReactTable({
    data: cases,
    columns: visibleColumns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);

  const runBulk = async (action: string) => {
    const res = await bulk.mutateAsync({ caseIds: selectedIds, action });
    toast.success(
      `${titleCase(action)} applied to ${res.applied} case(s)` +
        (res.recovered ? ` · ${res.recovered} recovered` : ""),
    );
    setRowSelection({});
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by id / entity…"
          className="h-8 w-52 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
        <NativeSelect
          ariaLabel="Lane"
          value={lane}
          onChange={setLane}
          className="w-44"
          options={[
            { value: "all", label: "All lanes" },
            ...LANES.map((l) => ({ value: l, label: LANE_LABELS[l] })),
          ]}
        />
        <NativeSelect
          ariaLabel="Value band"
          value={band}
          onChange={setBand}
          className="w-36"
          options={[
            { value: "all", label: "Any value" },
            { value: "lt1k", label: "< ₹1k" },
            { value: "1k-10k", label: "₹1k–10k" },
            { value: "10k-50k", label: "₹10k–50k" },
            { value: "gt50k", label: "> ₹50k" },
          ]}
        />
        <NativeSelect
          ariaLabel="Consent"
          value={consent}
          onChange={setConsent}
          className="w-36"
          options={[
            { value: "all", label: "Any consent" },
            { value: "granted", label: "Granted" },
            { value: "denied", label: "Denied" },
            { value: "unknown", label: "Unknown" },
          ]}
        />
        <NativeSelect
          ariaLabel="Needs approval"
          value={needsApproval}
          onChange={setNeedsApproval}
          className="w-40"
          options={[
            { value: "all", label: "All approvals" },
            { value: "true", label: "Needs approval" },
          ]}
        />
        <span className="ml-auto text-xs text-muted-foreground">
          {cases.length} case{cases.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Bulk action bar */}
      {perms.approveCases && selectedIds.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-accent/40 px-3 py-2">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <div className="ml-auto flex gap-1.5">
            <Button size="sm" onClick={() => runBulk("approve")} disabled={bulk.isPending}>
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => runBulk("escalate")} disabled={bulk.isPending}>
              Escalate
            </Button>
            <Button size="sm" variant="outline" onClick={() => runBulk("hold")} disabled={bulk.isPending}>
              Hold
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b bg-muted/40">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground"
                  >
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td colSpan={visibleColumns.length} className="px-3 py-3">
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setDrawer(row.original)}
                  className="cursor-pointer border-b transition-colors last:border-0 hover:bg-accent/40 data-[selected=true]:bg-accent/60"
                  data-selected={row.getIsSelected()}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={visibleColumns.length} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No cases match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail drawer */}
      <Sheet open={!!drawer} onOpenChange={(o) => !o && setDrawer(null)}>
        <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
          {drawer && (
            <>
              <SheetHeader className="border-b">
                <SheetTitle className="text-base">
                  {drawer.customerName || drawer.entityId}
                </SheetTitle>
                <SheetDescription>
                  <span className="font-mono">{drawer.entityId}</span> ·{" "}
                  {LANE_LABELS[drawer.lane as LaneName] ?? drawer.lane}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <MoneyText value={drawer.amount} className="text-lg" />
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <Field label="Verified state"><StatusPill status={drawer.currentState} /></Field>
                  <Field label="Approval"><StatusPill status={drawer.approvalState} /></Field>
                  <Field label="Failure">{titleCase(drawer.failureClass ?? "—")}</Field>
                  <Field label="Consent">{titleCase(drawer.consentState)}</Field>
                  <Field label="Proposed action">{titleCase(drawer.proposedAction ?? "—")}</Field>
                  <Field label="Confidence">{Math.round((drawer.confidence ?? 0) * 100)}%</Field>
                  <Field label="Reason code">{drawer.reasonCode ?? "—"}</Field>
                  <Field label="Attempts">{drawer.attemptCount}</Field>
                </dl>
                <Link
                  href={`/cases/${drawer.id}`}
                  className="flex items-center justify-center gap-1.5 rounded-lg border bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Open full decision log
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <ExternalLink className="size-3" /> Click a row for a quick summary, or open the full
        decision log.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}
