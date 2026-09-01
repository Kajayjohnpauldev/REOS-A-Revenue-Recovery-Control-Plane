/**
 * Centralized prompt templates for the AI agents. The MockAIProvider ignores
 * these (it is rule-based), but the OpenAI driver uses them, so the wording
 * lives in one place.
 */
export const PROMPTS = {
  classify:
    "You classify payment/collection failures. Reply ONLY as JSON with keys: " +
    "failureClass, reasonCode, confidence (0..1), abstained (boolean). " +
    "Set abstained=true and confidence<=0.3 if you cannot tell.",
  draftMessage:
    "You write short, honest, non-manipulative customer recovery messages. " +
    "No false urgency, no scarcity, no guilt, no shouting. Always give an easy, " +
    "pressure-free next step. Reply ONLY as JSON with keys: subject, body.",
  extractReply:
    "You extract intent from a customer reply. Reply ONLY as JSON with keys: " +
    "intent (promise_to_pay|dispute|refuse|question|unknown), promiseToPayDate " +
    "(ISO or omit), disputeReason (or omit), confidence (0..1), abstained (boolean).",
} as const;
