import { z } from "zod";

/**
 * Zod-parsed environment. Defaults keep the app in fully-offline MOCK MODE, so
 * it runs with zero external secrets. Parsing happens once at import time and
 * fails fast on an invalid value.
 */
const EnvSchema = z.object({
  DATABASE_URL: z.string().default("file:./dev.db"),
  AI_PROVIDER: z.enum(["mock", "openai"]).default("mock"),
  OPENAI_API_KEY: z.string().default(""),
  PAYMENTS_PROVIDER: z.enum(["mock", "razorpay"]).default("mock"),
  RAZORPAY_KEY_ID: z.string().default(""),
  RAZORPAY_KEY_SECRET: z.string().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(""),
  NODE_ENV: z.string().default("development"),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);

/** True when the AI provider is the offline deterministic mock. */
export const isAiMock = env.AI_PROVIDER === "mock" || !env.OPENAI_API_KEY;
/** True when the payments provider is the offline fixtures mock. */
export const isPaymentsMock =
  env.PAYMENTS_PROVIDER === "mock" || !env.RAZORPAY_KEY_SECRET;
