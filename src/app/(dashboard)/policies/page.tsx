"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePolicies, useSavePolicy } from "@/lib/hooks";
import { formatDateTime, formatINR, titleCase } from "@/lib/format";
import { parseCsv } from "@/lib/types";

const CHANNELS = ["email", "sms", "whatsapp"];
const CLASSES = ["low_value_retry", "insufficient_funds", "expired_card", "network_error"];

type Form = {
  retryBudget: number;
  amountThreshold: number;
  dueAgeDays: number;
  maxDiscountPct: number;
  consentRequired: boolean;
  channels: string[];
  autoApproveClasses: string[];
};

export default function PoliciesPage() {
  const policies = usePolicies();
  const savePolicy = useSavePolicy();
  const active = policies.data?.active;
  const [form, setForm] = useState<Form | null>(null);

  useEffect(() => {
    if (active && !form) {
      setForm({
        retryBudget: active.retryBudget,
        amountThreshold: active.amountThreshold,
        dueAgeDays: active.dueAgeDays,
        maxDiscountPct: active.maxDiscountPct,
        consentRequired: active.consentRequired,
        channels: parseCsv(active.allowedChannels),
        autoApproveClasses: parseCsv(active.autoApproveClasses),
      });
    }
  }, [active, form]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const toggle = (k: "channels" | "autoApproveClasses", v: string) =>
    setForm((f) =>
      f
        ? {
            ...f,
            [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v],
          }
        : f,
    );

  const save = async () => {
    if (!form) return;
    const res = await savePolicy.mutateAsync({
      retryBudget: form.retryBudget,
      amountThreshold: form.amountThreshold,
      dueAgeDays: form.dueAgeDays,
      maxDiscountPct: form.maxDiscountPct,
      consentRequired: form.consentRequired,
      allowedChannels: form.channels.join(","),
      autoApproveClasses: form.autoApproveClasses.join(","),
    });
    toast.success(`Saved as policy v${res.version}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Policies"
        description="The rules the merchant owns. Saving a change creates a new version — never an overwrite."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Editor */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            {!form ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField label="Retry budget (T+3)" value={form.retryBudget} onChange={(v) => set("retryBudget", v)} />
                  <NumberField label="Amount threshold (₹)" value={form.amountThreshold} onChange={(v) => set("amountThreshold", v)} />
                  <NumberField label="Due age (days)" value={form.dueAgeDays} onChange={(v) => set("dueAgeDays", v)} />
                  <NumberField label="Max discount (%)" value={form.maxDiscountPct} onChange={(v) => set("maxDiscountPct", v)} />
                </div>

                <Fieldset label="Allowed channels">
                  <div className="flex flex-wrap gap-4">
                    {CHANNELS.map((c) => (
                      <label key={c} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={form.channels.includes(c)} onCheckedChange={() => toggle("channels", c)} />
                        {titleCase(c)}
                      </label>
                    ))}
                  </div>
                </Fieldset>

                <Fieldset label="Auto-approve classes">
                  <div className="flex flex-wrap gap-4">
                    {CLASSES.map((c) => (
                      <label key={c} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={form.autoApproveClasses.includes(c)}
                          onCheckedChange={() => toggle("autoApproveClasses", c)}
                        />
                        {titleCase(c)}
                      </label>
                    ))}
                  </div>
                </Fieldset>

                <Fieldset label="Consent">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.consentRequired} onCheckedChange={(v) => set("consentRequired", !!v)} />
                    Require consent before any customer message
                  </label>
                </Fieldset>

                <div className="flex items-center gap-3 border-t pt-4">
                  <Button onClick={save} disabled={savePolicy.isPending}>
                    Save as new version
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Existing cases keep the policy version they were decided under.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Version history */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-5 py-3">
            <h2 className="text-sm font-semibold">Version history</h2>
          </div>
          <div className="divide-y">
            {policies.isLoading ? (
              <div className="p-5">
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              policies.data?.policies.map((p) => (
                <div key={p.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">v{p.version}</span>
                    {active?.id === p.id && (
                      <span className="rounded bg-money-recovered/12 px-1.5 py-0.5 text-[10px] font-medium text-money-recovered">
                        active
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    budget {p.retryBudget} · threshold {formatINR(p.amountThreshold)} · due {p.dueAgeDays}d
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Fieldset({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
