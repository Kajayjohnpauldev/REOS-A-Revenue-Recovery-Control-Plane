"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, ShieldCheck, Sparkles, Lock } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEMO = [
  { name: "Ajay John Paul", pw: "12345619", role: "Admin", tone: "text-money-net" },
  { name: "Aarav Mehta", pw: "operator123", role: "Operator", tone: "text-money-recovered" },
  { name: "Sara Iyer", pw: "analyst123", role: "Analyst", tone: "text-chart-4" },
  { name: "Devan Rao", pw: "auditor123", role: "Auditor", tone: "text-money-risk" },
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      const next = params.get("next");
      router.replace(next && next.startsWith("/") ? next : data.home);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-[#081d4a] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(60% 50% at 20% 15%, rgba(59,111,224,0.55), transparent 60%), radial-gradient(50% 40% at 90% 80%, rgba(14,165,233,0.35), transparent 60%), radial-gradient(40% 40% at 70% 20%, rgba(139,92,246,0.30), transparent 60%)",
          }}
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #3b6fe0, transparent 70%)" }}
        />
        <div className="relative z-10">
          <Logo className="text-white [&_span]:text-white [&_.text-primary]:text-sky-300" />
        </div>
        <div className="relative z-10 max-w-md">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-300/80">
            Revival Operating System
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight">
            Recover more revenue.
            <br />
            Prove every rupee.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            The revenue-recovery control plane for Razorpay merchants — reconcile
            against live state, act inside a policy you own, and never move a rupee
            you can&apos;t verify.
          </p>
          <div className="mt-8 space-y-3 text-sm">
            {[
              { icon: ShieldCheck, t: "Reconciled — no double charges, ever" },
              { icon: Sparkles, t: "Bounded AI that drafts, never decides money" },
              { icon: Lock, t: "Append-only ledger, full audit trail" },
            ].map(({ icon: Icon, t }) => (
              <div key={t} className="flex items-center gap-3 text-white/80">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-4 text-sky-200" />
                </span>
                {t}
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-xs text-white/40">
          Demo workspace · no real Razorpay or AI calls
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <LogoMark className="size-11" />
            <p className="mt-2 text-lg font-semibold">
              Revival<span className="text-primary">OS</span>
            </p>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your recovery workspace.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Name or email</label>
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Ajay John Paul"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Sign in
              {!loading && <ArrowRight className="size-4" />}
            </Button>
          </form>

          <div className="mt-8">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Demo accounts — click to fill
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => {
                    setIdentifier(d.name);
                    setPassword(d.pw);
                    setError(null);
                  }}
                  className="rounded-lg border bg-card p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className={cn("text-xs font-medium", d.tone)}>{d.role}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
