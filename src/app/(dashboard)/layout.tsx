import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current";
import { SessionProvider } from "@/lib/auth/context";
import { asRole } from "@/lib/auth/roles";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { EnvBanner } from "@/components/shell/EnvBanner";
import { AssistantOrb } from "@/components/assistant/AssistantOrb";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const pendingApprovals = await prisma.case.count({
    where: { approvalState: "pending" },
  });

  const sessionUser = {
    uid: user.id,
    name: user.name,
    email: user.email,
    role: asRole(user.role),
    title: user.title,
  };

  return (
    <SessionProvider value={sessionUser}>
      <div className="flex min-h-dvh bg-muted/30">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar pendingApprovals={pendingApprovals} />
          <EnvBanner />
          <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
      <AssistantOrb />
    </SessionProvider>
  );
}
