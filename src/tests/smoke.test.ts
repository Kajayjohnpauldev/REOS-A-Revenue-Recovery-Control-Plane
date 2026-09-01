import { describe, it, expect } from "vitest";

// Proves the Vitest pipeline is wired. Real engine tests arrive in Step 6.
describe("scaffold smoke", () => {
  it("runs the test pipeline", () => {
    expect(1 + 1).toBe(2);
  });
});
