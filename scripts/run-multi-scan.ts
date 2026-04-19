import { scanProject } from "@caistech/agent-trust-score";

async function main() {
  const projects = [
    { root: "C:/Users/denni/PycharmProjects/easy-claude-code", slug: "easy-claude-code" },
    { root: "C:/Users/denni/PycharmProjects/platform-trust", slug: "platform-trust" },
  ];

  for (const p of projects) {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`  Scanning: ${p.slug}`);
    console.log("═".repeat(60));

    const report = await scanProject({
      projectRoot: p.root,
      projectSlug: p.slug,
      projectId: `${p.slug}-local`,
      runBehavioural: false,
      baseUrl: "https://platform-trust.vercel.app",
    });

    console.log(`\n  GRADE: ${report.overall_grade} (${report.overall_score}/100)\n`);
    console.log("  Dimensions:");
    for (const [dim, score] of Object.entries(report.dimensions)) {
      console.log(`    ${dim.padEnd(20)} ${score.grade.padEnd(3)} (${score.score}/100)`);
    }
    console.log(`\n  Findings: ${report.critical_findings} critical, ${report.high_findings} high, ${report.medium_findings} medium, ${report.low_findings} low\n`);

    for (const f of report.findings) {
      const icon = f.verdict === "fail" ? "✗" : "◑";
      console.log(`  ${icon} [${f.id}] ${f.title} — ${f.severity}`);
      console.log(`    ${f.detail}`);
    }
  }
}

main().catch(console.error);
