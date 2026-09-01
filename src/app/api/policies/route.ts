import { parseJson, ok, badRequest } from "@/lib/api";
import { prisma } from "@/lib/db";
import { PolicySchema } from "@/lib/schemas";

export async function GET() {
  const policies = await prisma.policy.findMany({
    orderBy: { version: "desc" },
  });
  return ok({ policies, active: policies[0] ?? null });
}

/** Creating a policy always creates a NEW version — never an in-place edit. */
export async function POST(request: Request) {
  const parsed = await parseJson(PolicySchema, request);
  if (!parsed.ok) return parsed.res;

  const merchant = await prisma.merchant.findFirst();
  if (!merchant) return badRequest("No merchant found");

  const latest = await prisma.policy.findFirst({
    where: { merchantId: merchant.id },
    orderBy: { version: "desc" },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  const created = await prisma.policy.create({
    data: {
      merchantId: merchant.id,
      version: nextVersion,
      retryBudget: parsed.data.retryBudget,
      amountThreshold: parsed.data.amountThreshold,
      dueAgeDays: parsed.data.dueAgeDays,
      allowedChannels: parsed.data.allowedChannels,
      maxDiscountPct: parsed.data.maxDiscountPct,
      autoApproveClasses: parsed.data.autoApproveClasses,
      consentRequired: parsed.data.consentRequired,
    },
  });

  return ok({ created, version: nextVersion }, { status: 201 });
}
