/**
 * Run scans against all portfolio projects and store results in Supabase.
 * This populates the dashboard with real trust score data.
 */

import { scanProject } from "../packages/agent-trust-score";
import { supabaseAdmin } from "../lib/supabase";

const BASE = "C:/Users/denni/PycharmProjects";

const PROJECTS = [
  { root: `${BASE}/MMCBuild`, slug: "mmc-build" },
  { root: `${BASE}/easy-claude-code`, slug: "easy-claude-code" },
  { root: `${BASE}/platform-trust`, slug: "platform-trust" },
  { root: `${BASE}/storefront-mcp`, slug: "store-mcp" },
  { root: `${BASE}/gbta-openclaw`, slug: "openclaw" },
  { root: `${BASE}/F2K-Checkpoint-Latest`, slug: "f2k" },
  { root: `${BASE}/DealFindrs`, slug: "dealfindrs" },
  { root: `${BASE}/Tenderwatch`, slug: "tenderwatch" },
  { root: `${BASE}/SmartBoard`, slug: "smartboard" },
  { root: `${BASE}/Connexions`, slug: "connexions" },
  { root: `${BASE}/LaunchReady`, slug: "launchready" },
  { root: `${BASE}/Kira`, slug: "kira" },
  { root: `${BASE}/raiseready-core`, slug: "raise-ready" },
  { root: `${BASE}/universal-interviews`, slug: "universal-interviews" },
];

async function main() {
  // Load project UUIDs from Supabase
  const { data: projects } = await supabaseAdmin
    .from("projects")
    .select("id, slug, name");

  if (!projects) {
    console.error("Failed to load projects from Supabase");
    return;
  }

  const projectMap = new Map(projects.map((p: { id: string; slug: string }) => [p.slug, p.id]));

  let stored = 0;
  let skipped = 0;

  for (const p of PROJECTS) {
    const projectId = projectMap.get(p.slug);
    if (!projectId) {
      console.log(`  skip: ${p.slug} (not in projects table)`);
      skipped++;
      continue;
    }

    console.log(`  scanning: ${p.slug}...`);

    try {
      const report = await scanProject({
        projectRoot: p.root,
        projectSlug: p.slug,
        projectId,
        runBehavioural: false,
        baseUrl: "https://platform-trust.vercel.app",
      });

      const badgeExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabaseAdmin.from("security_scans").insert({
        project_id: projectId,
        scan_type: "portfolio_scan",
        triggered_by: "manual",
        compliance_status:
          report.overall_grade.startsWith("A") || report.overall_grade.startsWith("B")
            ? "PASS"
            : report.overall_grade === "D"
              ? "FAIL"
              : "REVIEW_REQUIRED",
        findings: report.findings,
        agent_trust_score: report,
        overall_grade: report.overall_grade,
        overall_score: report.overall_score,
        agent_safety_score: report.dimensions.agent_safety.score,
        code_security_score: report.dimensions.code_security.score,
        cost_governance_score: report.dimensions.cost_governance.score,
        compliance_score: report.dimensions.compliance.score,
        critical_count: report.critical_findings,
        high_count: report.high_findings,
        medium_count: report.medium_findings,
        low_count: report.low_findings,
        badge_expires_at: badgeExpiresAt,
      } as never);

      if (error) {
        console.log(`  error: ${p.slug} — ${error.message}`);
      } else {
        console.log(`  stored: ${p.slug} — Grade ${report.overall_grade} (${report.overall_score}/100)`);
        stored++;
      }
    } catch (err) {
      console.log(`  error: ${p.slug} — ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\nDone: ${stored} stored, ${skipped} skipped`);
}

main().catch(console.error);
