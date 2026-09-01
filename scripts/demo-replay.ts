/**
 * CLI demo — runs the SAME pipeline the Replay studio uses and prints the three
 * headline numbers. Usage: `npm run demo`.
 */
import { runReplay } from "@/lib/services/replay";
import { prisma } from "@/lib/db";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

async function main() {
  const { rows, summary } = await runReplay();

  console.log("\n=== RevivalOS — Replay ===\n");
  for (const r of rows) {
    console.log(`  #${r.moment} [${r.status.toUpperCase()}] ${r.label}`);
    console.log(`       ${r.explanation}`);
  }

  console.log("\n--- Summary ---");
  console.log(`  Gross recovered:        ${inr(summary.grossRecovered)}`);
  console.log(`  Incremental recovered:  ${inr(summary.incrementalRecovered)}  (vs matched holdout)`);
  console.log(`  Net recovered:          ${inr(summary.netRecovered)}  (after ${inr(summary.refunds)} refunds)`);
  console.log("");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
