/**
 * darkPatternScreen — refuses manipulative customer copy. This is a judged,
 * visible safety feature: false urgency, confirm-shaming, fake scarcity,
 * subscription traps, and shouty/aggressive tone are all rejected.
 */

export type DarkPatternResult = {
  passed: boolean;
  reason: string;
  hits: string[];
};

const REGEX_RULES: { name: string; test: RegExp }[] = [
  {
    name: "false_urgency",
    test: /\b(act now|immediately|right away|expires? (in|soon)|last chance|hurry|don'?t wait|within \d+\s*(hour|minute|min)s?|in \d+\s*(hour|minute|min)s?\b)/i,
  },
  {
    name: "confirm_shaming",
    test: /(you'?ll regret|don'?t be (foolish|silly)|only losers|miss out forever|lose (your )?(money|access) forever|no smart person)/i,
  },
  {
    name: "fake_scarcity",
    test: /(only \d+ (left|remaining)|almost gone|selling fast|limited stock|while supplies last|running out)/i,
  },
  {
    name: "subscription_trap",
    test: /(cannot cancel|can'?t cancel|no refunds ever|locked in|non-?refundable forever)/i,
  },
];

function excessiveCaps(text: string): boolean {
  const capsWords = text.match(/\b[A-Z]{4,}\b/g) ?? [];
  return capsWords.length >= 3;
}

function excessivePunctuation(text: string): boolean {
  return /!{2,}|\?{2,}/.test(text);
}

export function screenMessage(text: string): DarkPatternResult {
  const hits: string[] = [];
  for (const rule of REGEX_RULES) {
    if (rule.test.test(text)) hits.push(rule.name);
  }
  if (excessiveCaps(text)) hits.push("aggressive_caps");
  if (excessivePunctuation(text)) hits.push("aggressive_punctuation");

  return {
    passed: hits.length === 0,
    reason: hits.length ? `dark_pattern_${hits[0]}` : "clean",
    hits,
  };
}
