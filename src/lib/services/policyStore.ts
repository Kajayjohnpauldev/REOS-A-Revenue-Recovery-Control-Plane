import { prisma } from "@/lib/db";
import type { PolicyLike } from "@/lib/types";
import type { Policy } from "@prisma/client";

/** The active policy is the highest version for the merchant. */
export async function getActivePolicy(): Promise<Policy | null> {
  return prisma.policy.findFirst({ orderBy: { version: "desc" } });
}

export function toPolicyLike(p: Policy): PolicyLike {
  return {
    version: p.version,
    retryBudget: p.retryBudget,
    amountThreshold: p.amountThreshold,
    dueAgeDays: p.dueAgeDays,
    allowedChannels: p.allowedChannels,
    maxDiscountPct: p.maxDiscountPct,
    autoApproveClasses: p.autoApproveClasses,
    consentRequired: p.consentRequired,
  };
}

/** A safe fallback policy when none has been seeded yet. */
export const FALLBACK_POLICY: PolicyLike = {
  version: 1,
  retryBudget: 3,
  amountThreshold: 50_000,
  dueAgeDays: 7,
  allowedChannels: "email,sms",
  maxDiscountPct: 10,
  autoApproveClasses: "low_value_retry",
  consentRequired: true,
};

export async function getActivePolicyLike(): Promise<PolicyLike> {
  const p = await getActivePolicy();
  return p ? toPolicyLike(p) : FALLBACK_POLICY;
}
