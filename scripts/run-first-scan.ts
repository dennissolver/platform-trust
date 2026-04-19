/**
 * First scan — run Agent Trust Score against MMC Build locally.
 * Usage: npx tsx scripts/run-first-scan.ts
 */

import { scanProject } from "@caistech/agent-trust-score";

async function main() {
  const projectRoot = "C:/Users/denni/PycharmProjects/MMCBuild";

  console.log(`\nScanning: ${projectRoot}\n`);

  const report = await scanProject({
    projectRoot,
    projectSlug: "mmc-build",
    projectId: "mmc-build-local",
    runBehavioural: false,
    baseUrl: "https://platform-trust.vercel.app",
  });

  console.log("═══════════════════════════════════════════════════════");
  console.log(`  AGENT TRUST SCORE: ${report.overall_grade} (${report.overall_score}/100)`);
  console.log("═══════════════════════════════════════════════════════\n");

  console.log("Dimensions:");
  for (const [dim, score] of Object.entries(report.dimensions)) {
    console.log(`  ${dim.padEnd(20)} ${score.grade} (${score.score}/100)`);
  }

  console.log(`\nFindings: ${report.critical_findings} critical, ${report.high_findings} high, ${report.medium_findings} medium, ${report.low_findings} low\n`);

  if (report.findings.length > 0) {
    console.log("Findings detail:");
    for (const f of report.findings) {
      const icon = f.verdict === "fail" ? "✗" : "◑";
      console.log(`  ${icon} [${f.id}] ${f.title} (${f.severity})`);
      console.log(`    ${f.detail}`);
      if (f.remediation) console.log(`    Fix: ${f.remediation}`);
      console.log();
    }
  }

  console.log(`Badge: ${report.badge_url}`);
  console.log(`Report: ${report.report_url}\n`);
}

main().catch(console.error);
