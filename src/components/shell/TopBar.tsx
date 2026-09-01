"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Search, Bell, Play, Sun, Moon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function TopBar({ pendingApprovals }: { pendingApprovals: number }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => setMounted(true), []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/cases?q=${encodeURIComponent(q)}` : "/cases");
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
      <form onSubmit={submitSearch} className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cases by id, entity, or lane…"
          className="pl-9"
          aria-label="Search cases"
        />
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <Link
          href="/replay"
          className={cn(buttonVariants({ variant: "default", size: "sm" }), "gap-1.5")}
        >
          <Play className="size-4" />
          <span className="hidden sm:inline">Run Replay</span>
        </Link>

        <Link
          href="/approvals"
          aria-label={`Approvals (${pendingApprovals} pending)`}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
        >
          <Bell className="size-4.5" />
          {pendingApprovals > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-money-risk px-1 text-[10px] font-semibold leading-4 text-white">
              {pendingApprovals}
            </span>
          )}
        </Link>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun className="size-4.5" />
          ) : (
            <Moon className="size-4.5" />
          )}
        </Button>
      </div>
    </header>
  );
}
