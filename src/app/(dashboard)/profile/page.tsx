"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Gavel, CheckCircle2, TrendingUp, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LABEL, asRole } from "@/lib/auth/roles";
import { formatINR, formatDate } from "@/lib/format";

type ProfileResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    title: string | null;
    avatarUrl: string;
    createdAt: string;
  };
  stats: {
    decisionsMade: number;
    approvals: number;
    escalations: number;
    recoveredValue: number;
  };
};

function fileToAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const qc = useQueryClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const r = await fetch("/api/profile");
      if (!r.ok) throw new Error("failed");
      return r.json() as Promise<ProfileResponse>;
    },
  });

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [avatar, setAvatar] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (data && !ready) {
      setName(data.user.name);
      setTitle(data.user.title ?? "");
      setAvatar(data.user.avatarUrl ?? "");
      setReady(true);
    }
  }, [data, ready]);

  const save = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, title, avatarUrl: avatar }),
      });
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      router.refresh();
      toast.success("Profile updated");
    },
    onError: () => toast.error("Couldn't save your profile"),
  });

  const onPick = async (file?: File) => {
    if (!file) return;
    try {
      setAvatar(await fileToAvatar(file));
    } catch {
      toast.error("Couldn't read that image");
    }
  };

  const initials = (name || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");
  const role = data ? asRole(data.user.role) : "operator";

  return (
    <div className="space-y-6">
      <PageHeader title="Your profile" description="Manage your identity and see your impact." />

      {isLoading || !data ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Identity card */}
          <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm">
            <div
              className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full opacity-50 blur-3xl"
              style={{ background: "radial-gradient(circle, color-mix(in oklch, var(--accent-blue) 24%, transparent), transparent 70%)" }}
            />
            <div className="relative flex flex-col items-center text-center">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="group relative size-24 overflow-hidden rounded-full ring-2 ring-border transition-transform hover:scale-105"
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="avatar" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center bg-foreground text-2xl font-semibold text-background">
                    {initials}
                  </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="size-5 text-white" />
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPick(e.target.files?.[0])}
              />
              <p className="mt-4 text-lg font-semibold">{name}</p>
              <p className="text-sm text-muted-foreground">{data.user.email}</p>
              <span className="mt-3 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                {ROLE_LABEL[role]}
              </span>
              <p className="mt-3 text-xs text-muted-foreground">
                Member since {formatDate(data.user.createdAt)}
              </p>
            </div>
          </div>

          {/* Edit + stats */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold">Edit details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Full name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Founder & Admin" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
                  Save changes
                </Button>
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Camera className="size-4" /> Change photo
                </Button>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold">Your impact</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={<Gavel className="size-4" />} label="Decisions made" value={data.stats.decisionsMade} />
                <StatCard icon={<CheckCircle2 className="size-4" />} label="Approvals" value={data.stats.approvals} tone="text-money-recovered" />
                <StatCard icon={<ArrowUpRight className="size-4" />} label="Escalations" value={data.stats.escalations} tone="text-money-risk" />
                <StatCard icon={<TrendingUp className="size-4" />} label="Recovered" value={formatINR(data.stats.recoveredValue)} tone="text-money-net" />
              </div>
              {data.stats.decisionsMade === 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Your impact grows as you work cases — approve, escalate, or hold from the Cases and Approvals screens.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone = "text-foreground",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <p className={`mt-3 text-2xl font-semibold reos-tnum ${tone}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
