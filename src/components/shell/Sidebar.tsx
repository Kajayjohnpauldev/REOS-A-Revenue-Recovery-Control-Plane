"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  CircleCheckBig,
  ShieldAlert,
  BookText,
  SlidersHorizontal,
  Bot,
  Play,
  ChartColumnBig,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { useSession } from "@/lib/auth/context";
import { canAccess, ROLE_LABEL } from "@/lib/auth/roles";

const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/cases", label: "Cases", icon: ListChecks },
  { href: "/approvals", label: "Approvals", icon: CircleCheckBig },
  { href: "/guardrails", label: "Guardrails", icon: ShieldAlert },
  { href: "/ledger", label: "Ledger", icon: BookText },
  { href: "/policies", label: "Policies", icon: SlidersHorizontal },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/replay", label: "Replay", icon: Play },
  { href: "/metrics", label: "Metrics", icon: ChartColumnBig },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const items = NAV.filter((n) => canAccess(session.role, n.href));
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const initials = session.name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-dvh shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Brand */}
      <div className="flex h-14 items-center px-4">
        {collapsed ? (
          <LogoMark className="size-8" />
        ) : (
          <Logo />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              {active && !collapsed && (
                <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-primary-foreground/70" />
              )}
              <Icon className="size-4.5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Operator menu */}
      <div className="relative border-t p-2">
        {menuOpen && (
          <>
            <button
              className="fixed inset-0 z-10 cursor-default"
              aria-hidden
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute bottom-full left-2 right-2 z-20 mb-1 overflow-hidden rounded-lg border bg-popover p-1 shadow-lg">
              <div className="px-2.5 py-2">
                <p className="truncate text-sm font-medium">{session.name}</p>
                <p className="truncate text-xs text-muted-foreground">{session.email}</p>
              </div>
              <div className="my-1 h-px bg-border" />
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="size-4" /> Log out
              </button>
            </div>
          </>
        )}

        <button
          onClick={() => setMenuOpen((o) => !o)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-sidebar-accent",
            collapsed && "justify-center px-0",
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent-blue text-xs font-semibold text-white">
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium">{session.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {ROLE_LABEL[session.role]}
                </p>
              </div>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-xs text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="size-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
