import { scanProject } from "@caistech/agent-trust-score";

const PROJECTS = [
  { root: "C:/Users/denni/PycharmProjects/MMCBuild", slug: "mmc-build" },
  { root: "C:/Users/denni/PycharmProjects/easy-claude-code", slug: "easy-claude-code" },
  { root: "C:/Users/denni/PycharmProjects/platform-trust", slug: "platform-trust" },
  { root: "C:/Users/denni/PycharmProjects/storefront-mcp", slug: "storefront-mcp" },
  { root: "C:/Users/denni/PycharmProjects/gbta-openclaw", slug: "openclaw" },
  { root: "C:/Users/denni/PycharmProjects/F2K-Checkpoint-Latest", slug: "f2k-checkpoint" },
  { root: "C:/Users/denni/PycharmProjects/DealFindrs", slug: "dealfindrs" },
  { root: "C:/Users/denni/PycharmProjects/Tenderwatch", slug: "tenderwatch" },
  { root: "C:/Users/denni/PycharmProjects/SmartBoard", slug: "smartboard" },
  { root: "C:/Users/denni/PycharmProjects/Connexions", slug: "connexions" },
  { root: "C:/Users/denni/PycharmProjects/LaunchReady", slug: "launchready" },
  { root: "C:/Users/denni/PycharmProjects/PubGuard", slug: "pubguard" },
  { root: "C:/Users/denni/PycharmProjects/property-services", slug: "property-services" },
  { root: "C:/Users/denni/PycharmProjects/Kira", slug: "kira" },
  { root: "C:/Users/denni/PycharmProjects/coordination", slug: "coordination" },
  { root: "C:/Users/denni/PycharmProjects/agentic-os", slug: "agentic-os" },
  { root: "C:/Users/denni/PycharmProjects/raiseready-core", slug: "raiseready" },
  { root: "C:/Users/denni/PycharmProjects/GRFC_Projects", slug: "grfc" },
  { root: "C:/Users/denni/PycharmProjects/ConferenceLingo", slug: "conferencelingo" },
  { root: "C:/Users/denni/PycharmProjects/TourLingo", slug: "tourlingo" },
  { root: "C:/Users/denni/PycharmProjects/ApplicationReady", slug: "applicationready" },
  { root: "C:/Users/denni/PycharmProjects/nudge-core", slug: "nudge-core" },
  { root: "C:/Users/denni/PycharmProjects/reverseauction", slug: "reverseauction" },
  { root: "C:/Users/denni/PycharmProjects/llm-council", slug: "llm-council" },
  { root: "C:/Users/denni/PycharmProjects/property-analysis-sdk", slug: "property-analysis-sdk" },
  { root: "C:/Users/denni/PycharmProjects/LeadSpark", slug: "leadspark" },
  { root: "C:/Users/denni/PycharmProjects/QuoteMaster", slug: "quotemaster" },
  { root: "C:/Users/denni/PycharmProjects/HouseSitAgent", slug: "housesitagent" },
  { root: "C:/Users/denni/PycharmProjects/NDISSDAAutomate", slug: "ndis-sda-automate" },
  { root: "C:/Users/denni/PycharmProjects/universal-interviews", slug: "universal-interviews" },
];

interface Result {
  slug: string;
  grade: string;
  score: number;
  safety: number;
  code: number;
  cost: number;
  compliance: number;
  critical: number;
  high: number;
  findings: number;
}

async function main() {
  const results: Result[] = [];
  const errors: string[] = [];

  for (const p of PROJECTS) {
    try {
      const report = await scanProject({
        projectRoot: p.root,
        projectSlug: p.slug,
        projectId: `${p.slug}-local`,
        runBehavioural: false,
        baseUrl: "https://platform-trust.vercel.app",
      });

      results.push({
        slug: p.slug,
        grade: report.overall_grade,
        score: report.overall_score,
        safety: report.dimensions.agent_safety.score,
        code: report.dimensions.code_security.score,
        cost: report.dimensions.cost_governance.score,
        compliance: report.dimensions.compliance.score,
        critical: report.critical_findings,
        high: report.high_findings,
        findings: report.findings.length,
      });
    } catch (err) {
      errors.push(`${p.slug}: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Print table
  console.log("\n╔══════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                      AGENT TRUST SCORE — PORTFOLIO SCAN                        ║");
  console.log("╠══════════════════════════════════════════════════════════════════════════════════╣");
  console.log("║ Project                │ Grade │ Score │ Safety │ Code │ Cost │ Comply │ Issues ║");
  console.log("╟────────────────────────┼───────┼───────┼────────┼──────┼──────┼────────┼────────╢");

  for (const r of results) {
    const slug = r.slug.padEnd(22);
    const grade = r.grade.padEnd(5);
    const score = String(r.score).padStart(3);
    const safety = String(r.safety).padStart(4);
    const code = String(r.code).padStart(4);
    const cost = String(r.cost).padStart(4);
    const comply = String(r.compliance).padStart(4);
    const issues = `${r.critical}C ${r.high}H`;
    console.log(`║ ${slug} │  ${grade}│  ${score}  │  ${safety}  │ ${code} │ ${cost} │  ${comply}  │ ${issues.padEnd(6)} ║`);
  }

  console.log("╚══════════════════════════════════════════════════════════════════════════════════╝");

  // Summary stats
  const gradeA = results.filter(r => r.grade.startsWith("A")).length;
  const gradeB = results.filter(r => r.grade.startsWith("B")).length;
  const gradeC = results.filter(r => r.grade.startsWith("C")).length;
  const gradeD = results.filter(r => r.grade === "D").length;
  const avg = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
  const totalCritical = results.reduce((s, r) => s + r.critical, 0);

  console.log(`\nPortfolio: ${results.length} projects scanned, ${errors.length} failed`);
  console.log(`Grades: ${gradeA} A, ${gradeB} B, ${gradeC} C, ${gradeD} D`);
  console.log(`Average score: ${avg}/100`);
  console.log(`Total critical findings: ${totalCritical}`);

  if (errors.length > 0) {
    console.log(`\nSkipped (${errors.length}):`);
    for (const e of errors) console.log(`  - ${e}`);
  }
}

main().catch(console.error);
