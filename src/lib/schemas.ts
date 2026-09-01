import { z } from "zod";
import { LANES } from "@/lib/types";

export const CasesQuerySchema = z.object({
  lane: z.enum(LANES).optional(),
  minAmount: z.coerce.number().int().nonnegative().optional(),
  maxAmount: z.coerce.number().int().nonnegative().optional(),
  approvalState: z.string().optional(),
  consentState: z.string().optional(),
  needsApproval: z
    .union([z.literal("true"), z.literal("false")])
    .optional(),
  q: z.string().optional(),
});
export type CasesQuery = z.infer<typeof CasesQuerySchema>;

export const ActionSchema = z.object({
  action: z.enum(["approve", "reject", "escalate", "hold"]),
  note: z.string().max(500).optional(),
});
export type ActionInput = z.infer<typeof ActionSchema>;

export const BulkActionSchema = z.object({
  caseIds: z.array(z.string()).min(1),
  action: z.enum(["approve", "reject", "escalate", "hold"]),
  note: z.string().max(500).optional(),
});
export type BulkActionInput = z.infer<typeof BulkActionSchema>;

export const PolicySchema = z.object({
  retryBudget: z.coerce.number().int().min(0).max(10),
  amountThreshold: z.coerce.number().int().min(0),
  dueAgeDays: z.coerce.number().int().min(0).max(365),
  allowedChannels: z.string(), // csv
  maxDiscountPct: z.coerce.number().int().min(0).max(100),
  autoApproveClasses: z.string(), // csv
  consentRequired: z.boolean(),
});
export type PolicyInput = z.infer<typeof PolicySchema>;

export const AllowlistSchema = z.object({
  allowlist: z.array(z.string()),
  enabled: z.boolean().optional(),
});
export type AllowlistInput = z.infer<typeof AllowlistSchema>;

export const ReplaySchema = z.object({
  lanes: z.array(z.enum(LANES)).optional(),
  holdoutPct: z.coerce.number().min(0).max(100).optional(),
});
export type ReplayInput = z.infer<typeof ReplaySchema>;

export const SimulateRefundSchema = z.object({
  caseId: z.string().optional(),
});
export type SimulateRefundInput = z.infer<typeof SimulateRefundSchema>;

export const LedgerQuerySchema = z.object({
  lane: z.enum(LANES).optional(),
  type: z.string().optional(),
});
export type LedgerQuery = z.infer<typeof LedgerQuerySchema>;

export const WebhookSchema = z.object({
  type: z.string(),
  idempotencyKey: z.string().optional(),
  orderIndex: z.coerce.number().int().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});
export type WebhookInput = z.infer<typeof WebhookSchema>;
