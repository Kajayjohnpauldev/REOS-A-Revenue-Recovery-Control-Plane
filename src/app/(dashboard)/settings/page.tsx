"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Plug,
  ShieldCheck,
  Bot,
  CreditCard,
  Sparkles,
  ExternalLink,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLES, ROLE_LABEL, ROLE_TAGLINE, type Role } from "@/lib/auth/roles";
import { titleCase } from "@/lib/format";

type SettingsResponse = {
  merchant: { id: string; name: string; environment: string } | null;
  users: { id: string; name: string; email: string; role: string; title: string | null }[];
  connections: { gemini: boolean; geminiSource: string; payments: string; ai: string };
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
  const [geminiKey, setGeminiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string; model?: string } | null>(null);

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch("/api/settings/test-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: geminiKey || undefined }),
      });
      const d = await r.json();
      setTestResult(d);
      if (d.ok) toast.success(`Gemini is working (${d.model})`);
      else toast.error("Gemini test failed");
    } catch {
      setTestResult({ ok: false, error: "request failed" });
    } finally {
      setTesting(false);
    }
  };
  useEffect(() => {
    if (data?.merchant && !name) setName(data.merchant.name);
  }, [data, name]);

  const saveName = useMutation({
    mutationFn: (n: string) => post({ name: n }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Workspace name updated");
    },
  });

  const saveGemini = useMutation({
    mutationFn: (key: string) => post({ geminiApiKey: key }),
    onSuccess: (_res, key) => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setGeminiKey("");
      window.dispatchEvent(new Event("reos-gemini-updated"));
      toast.success(key ? "Baymax is now connected to Gemini" : "Gemini disconnected");
    },
    onError: () => toast.error("Couldn't save the key"),
  });

  const connected = !!data?.connections.gemini;
  const lockedByEnv = data?.connections.geminiSource === "env";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Your workspace, connections, and team. Admin only."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Workspace */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Building2 className="size-4" />
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
              <Button size="sm" onClick={() => saveName.mutate(name)} disabled={saveName.isPending}>
                Save
              </Button>
            </div>
          )}
        </div>

        {/* Connect Gemini */}
        <div className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2">
          <div
            className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-60 blur-3xl"
            style={{ background: "radial-gradient(circle, color-mix(in oklch, var(--accent-blue) 30%, transparent), transparent 70%)" }}
          />
          <div className="relative flex items-center gap-2">
            <Sparkles className="size-4" />
            <h2 className="text-sm font-semibold">Connect Gemini · power up Baymax</h2>
            {connected && (
              <span className="ml-auto flex items-center gap-1 rounded-full bg-money-recovered/12 px-2 py-0.5 text-xs font-medium text-money-recovered">
                <Check className="size-3" /> Connected
              </span>
            )}
          </div>
          <p className="relative mt-1.5 text-sm text-muted-foreground">
            Baymax works offline out of the box. Paste a Google Gemini key to unlock full AI
            answers — it&apos;s stored in your local workspace only.
          </p>
          {lockedByEnv ? (
            <p className="relative mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              A key is set via <code className="rounded bg-background px-1">.env</code> and takes
              precedence. Remove it to manage the key here.
            </p>
          ) : (
            <div className="relative mt-4 flex flex-col gap-2 sm:flex-row">
              <Input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder={connected ? "•••••••••••• (a key is saved)" : "Paste your Gemini API key"}
                className="flex-1"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => saveGemini.mutate(geminiKey)}
                  disabled={saveGemini.isPending || !geminiKey.trim()}
                >
                  {connected ? "Update" : "Connect"}
                </Button>
                {connected && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => saveGemini.mutate("")}
                    disabled={saveGemini.isPending}
                  >
                    Disconnect
                  </Button>
                )}
              </div>
            </div>
          )}
          <div className="relative mt-3 flex flex-wrap items-center gap-3">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-accent-blue hover:underline"
            >
              Get a free key from Google AI Studio <ExternalLink className="size-3" />
            </a>
            <Button size="xs" variant="outline" onClick={runTest} disabled={testing}>
              {testing ? "Testing…" : "Test connection"}
            </Button>
            {testResult && (
              <span
                className={`text-xs font-medium ${testResult.ok ? "text-money-recovered" : "text-destructive"}`}
              >
                {testResult.ok
                  ? `✓ Working (${testResult.model})`
                  : `✗ ${testResult.error}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Connections status */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Plug className="size-4" />
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
            label="Baymax (Gemini)"
            value={connected ? "Connected" : "Offline guide"}
            on={connected}
          />
        </div>
      </div>

      {/* Team */}
      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b px-5 py-3">
          <Users className="size-4" />
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
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Roles &amp; access</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ROLES.map((r: Role) => (
            <div key={r} className="rounded-xl border bg-background p-3">
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_TONE[r]}`}>
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

async function post(body: Record<string, unknown>) {
  const r = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("failed");
  return r.json();
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
    <div className="rounded-xl border bg-background p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
        <span className={`ml-auto size-2 rounded-full ${on ? "bg-money-recovered" : "bg-muted-foreground/40"}`} />
      </div>
      <p className="mt-1.5 text-sm font-medium">{value}</p>
    </div>
  );
}
