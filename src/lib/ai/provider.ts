/**
 * AIProvider — the ONLY seam through which RevivalOS uses an LLM.
 *
 * AI is used to classify, draft, and extract — NEVER to move money or decide a
 * charge. Every method has a deterministic mock (default) and an abstention path
 * (low confidence -> the caller routes to a human).
 */

export type ClassifyInput = {
  lane: string;
  entityType: string;
  /** Current/last-known entity status (e.g. "failed", "pending"). */
  status: string;
  errorCode?: string;
  errorDescription?: string;
  amount: number;
  attemptCount: number;
};

export type ClassifyOutput = {
  failureClass: string;
  reasonCode: string;
  /** 0..1 */
  confidence: number;
  /** True when the model cannot classify and the case should be escalated. */
  abstained: boolean;
};

export type DraftMessageInput = {
  lane: string;
  channel: string;
  amount: number;
  entityId: string;
  customerName?: string;
  reason?: string;
  tone?: "neutral" | "friendly" | "firm";
};

export type DraftMessageOutput = {
  subject?: string;
  body: string;
};

export type ExtractReplyInput = {
  text: string;
};

export type ReplyIntent =
  | "promise_to_pay"
  | "dispute"
  | "refuse"
  | "question"
  | "unknown";

export type ExtractReplyOutput = {
  intent: ReplyIntent;
  promiseToPayDate?: string;
  disputeReason?: string;
  confidence: number;
  abstained: boolean;
};

export interface AIProvider {
  readonly name: string;
  classify(input: ClassifyInput): Promise<ClassifyOutput>;
  draftMessage(input: DraftMessageInput): Promise<DraftMessageOutput>;
  extractReply(input: ExtractReplyInput): Promise<ExtractReplyOutput>;
}
