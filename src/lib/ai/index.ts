import { env } from "@/lib/env";
import type { AIProvider } from "./provider";
import { MockAIProvider } from "./mock";
import { OpenAIProvider } from "./openai";

export type { AIProvider } from "./provider";

let cached: AIProvider | null = null;

/**
 * Returns the configured AI provider. Defaults to the offline MockAIProvider
 * unless AI_PROVIDER=openai AND an OPENAI_API_KEY is set.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  cached =
    env.AI_PROVIDER === "openai" && env.OPENAI_API_KEY
      ? new OpenAIProvider(env.OPENAI_API_KEY)
      : new MockAIProvider();
  return cached;
}
