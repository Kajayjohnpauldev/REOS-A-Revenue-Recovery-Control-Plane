import { PROMPTS } from "@/lib/agents/prompts";
import type {
  AIProvider,
  ClassifyInput,
  ClassifyOutput,
  DraftMessageInput,
  DraftMessageOutput,
  ExtractReplyInput,
  ExtractReplyOutput,
} from "./provider";

/**
 * OpenAI-compatible driver. Only instantiated when AI_PROVIDER=openai AND
 * OPENAI_API_KEY is present (see ./index.ts). In the default mock build this
 * file is never executed — it exists so a real key can be dropped in later.
 *
 * // TODO(revivalos): tune prompts, add retries/timeouts, and pin a model.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(
    private readonly apiKey: string,
    opts?: { baseUrl?: string; model?: string },
  ) {
    this.baseUrl = opts?.baseUrl ?? "https://api.openai.com/v1";
    this.model = opts?.model ?? "gpt-4o-mini";
  }

  private async chatJson<T>(system: string, user: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI request failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "{}";
    return JSON.parse(content) as T;
  }

  async classify(input: ClassifyInput): Promise<ClassifyOutput> {
    return this.chatJson<ClassifyOutput>(PROMPTS.classify, JSON.stringify(input));
  }

  async draftMessage(input: DraftMessageInput): Promise<DraftMessageOutput> {
    return this.chatJson<DraftMessageOutput>(
      PROMPTS.draftMessage,
      JSON.stringify(input),
    );
  }

  async extractReply(input: ExtractReplyInput): Promise<ExtractReplyOutput> {
    return this.chatJson<ExtractReplyOutput>(PROMPTS.extractReply, input.text);
  }
}
