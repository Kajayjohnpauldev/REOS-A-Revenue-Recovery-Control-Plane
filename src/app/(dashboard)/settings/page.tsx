"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Users, Plug, ShieldCheck, Bot, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLES, ROLE_LABEL, ROLE_TAGLINE, type Role } from "@/lib/auth/roles";
import { titleCase } from "@/lib/format";

type SettingsResponse = {
  merchant: { id: string; name: string; environment: string } | null;
  users: { id: string; name: string; email: string; role: string; title: string | null }[];
  connections: { gemini: boolean; payments: string; ai: string };
};

const ROLE_TONE: Record<string, string> = {
  admin: "bg-money-net/12 text-money-net",
  operator: "bg-money-recovered/12 text-money-recovered",
  analyst: "bg-chart-4/15 text-chart-4",
  auditor: "bg-money-risk/15 text-money-risk",
};

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const r = await fetch("/api/settings");
      if (!r.ok) throw new Error("failed");
      return r.json() as Promise<SettingsResponse>;
    },
  });
  const [name, setName] = useState("");
  useEffect(() => {
    if (data?.merchant && !name) setName(data.merchant.name);
  }, [data, name]);

  const save = useMutation({
    mutationFn: async (n: string) => {
      const r = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Workspace name updated");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Your workspace, team, and connections. Admin only."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Workspace */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Workspace</h2>
          </div>
          {isLoading ? (
            <Skeleton className="mt-4 h-9 w-full" />
          ) : (
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Merchant / company name
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <Button size="sm" onClick={() => save.mutate(name)} disabled={save.isPending}>
                Save
              </Button>
            </div>
          )}
        </div>

        {/* Connections */}
        <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2">
            <Plug className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Connections</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ConnCard
              icon={<CreditCard className="size-4" />}
              label="Payments"
              value={data?.connections.payments === "razorpay" ? "Razorpay (live)" : "Mock fixtures"}
              on={data?.connections.payments === "razorpay"}
            />
            <ConnCard
              icon={<Bot className="size-4" />}
              label="Classifier AI"
              value={data?.connections.ai === "openai" ? "OpenAI" : "Mock (offline)"}
              on={data?.connections.ai === "openai"}
            />
            <ConnCard
              icon={<ShieldCheck className="size-4" />}
              label="Help assistant"
              value={data?.connections.gemini ? "Gemini connected" : "Offline guide"}
              on={!!data?.connections.gemini}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Add keys to <code className="rounded bg-muted px-1">.env</code> to switch any
            connection from mock to live — the app runs fully without them.
          </p>
        </div>
      </div>

      {/* Team */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b px-5 py-3">
          <Users className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Team</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {data?.users.length ?? 0} members
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                <th className="px-5 py-2.5 text-left font-medium">Name</th>
                <th className="px-5 py-2.5 text-left font-medium">Title</th>
                <th className="px-5 py-2.5 text-left font-medium">Email</th>
                <th className="px-5 py-2.5 text-left font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-5">
                    <Skeleton className="h-20 w-full" />
                  </td>
                </tr>
              ) : (
                data?.users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="px-5 py-2.5 font-medium">{u.name}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{u.title ?? "—"}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{u.email}</td>
                    <td className="px-5 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          ROLE_TONE[u.role] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {titleCase(u.role)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roles reference */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Roles &amp; access</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ROLES.map((r: Role) => (
            <div key={r} className="rounded-lg border bg-background p-3">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_TONE[r]}`}
              >
                {ROLE_LABEL[r]}
              </span>
              <p className="mt-2 text-xs text-muted-foreground">{ROLE_TAGLINE[r]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConnCard({
  icon,
  label,
  value,
  on,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  on: boolean;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
        <span
          className={`ml-auto size-2 rounded-full ${on ? "bg-money-recovered" : "bg-muted-foreground/40"}`}
        />
      </div>
      <p className="mt-1.5 text-sm font-medium">{value}</p>
    </div>
  );
}
