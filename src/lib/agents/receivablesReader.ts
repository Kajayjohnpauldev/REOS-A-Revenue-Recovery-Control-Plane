import { getAIProvider } from "@/lib/ai";
import type { ExtractReplyOutput } from "@/lib/ai/provider";

/**
 * Receivables Reader (AI) — extract intent, a promise-to-pay date, or a dispute
 * reason from a customer reply. Abstains on low confidence.
 */
export async function readReply(text: string): Promise<ExtractReplyOutput> {
  const ai = getAIProvider();
  return ai.extractReply({ text });
}
