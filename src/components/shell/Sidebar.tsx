"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  PanelLeftClose,
  PanelLeftOpen,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
];

export function Sidebar({
  operator,
}: {
  operator: { name: string; role: string };
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-dvh shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Wordmark */}
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
          <Activity className="size-4.5" />
        </div>
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="truncate text-sm font-semibold tracking-tight">
              RevivalOS
            </span>
            <span className="rounded bg-money-risk/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-money-risk">
              Test
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="size-4.5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Operator + collapse */}
      <div className="border-t p-2">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2 py-2",
            collapsed && "justify-center px-0",
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {operator.name
              .split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("")}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{operator.name}</p>
              <p className="truncate text-xs capitalize text-muted-foreground">
                {operator.role}
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4.5 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="size-4.5 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
