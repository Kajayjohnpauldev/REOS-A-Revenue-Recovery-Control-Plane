import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { EnvBanner } from "@/components/shell/EnvBanner";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [user, pendingApprovals] = await Promise.all([
    prisma.user.findFirst(),
    prisma.case.count({ where: { approvalState: "pending" } }),
  ]);

  const operator = {
    name: user?.name ?? "Operator",
    role: user?.role ?? "operator",
  };

  return (
    <div className="flex min-h-dvh">
      <Sidebar operator={operator} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar pendingApprovals={pendingApprovals} />
        <EnvBanner />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
