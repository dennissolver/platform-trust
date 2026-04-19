/**
 * Scheduled Trust Score Scanner
 *
 * Runs weekly against all registered projects.
 * Clones each repo, runs Layer 1 + 2 scan, stores results.
 *
 * Schedule: Every Monday at 3am AEST (17:00 UTC Sunday)
 * On-demand: Send event "trust-score/scan.requested"
 */

import { inngest } from "../client";
import { supabaseAdmin } from "../../supabase";
import { scanProject } from "@caistech/agent-trust-score";
import { execSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Map project slugs to their GitHub clone URLs
const PROJECT_REPOS: Record<string, string> = {
  "mmc-build": "https://github.com/Corporate-AI-Solutions/MMCBuild.git",
  "easy-claude-code": "https://github.com/dennissolver/easy-claude-code.git",
  "platform-trust": "https://github.com/Corporate-AI-Solutions/platform-trust.git",
  "storefront-mcp": "https://github.com/Corporate-AI-Solutions/storefront-mcp.git",
};

export const runTrustScan = inngest.createFunction(
  {
    id: "run-trust-scan",
    name: "Scheduled Trust Score Scan",
    retries: 1,
    triggers: [
      // Weekly Monday 3am AEST (17:00 UTC Sunday)
      { cron: "0 17 * * 0" },
      // On-demand
      { event: "trust-score/scan.requested" },
    ],
  },
  async ({ event, step }: { event: { data?: Record<string, unknown> }; step: any }) => {
    const targetSlug = event?.data?.projectSlug as string | undefined;

    // Load projects to scan
    const projects = await step.run("load-projects", async () => {
      if (targetSlug) {
        const { data } = await supabaseAdmin
          .from("projects")
          .select("id, slug, name")
          .eq("slug", targetSlug)
          .single();
        return data ? [data] : [];
      }

      const { data } = await supabaseAdmin
        .from("projects")
        .select("id, slug, name");
      // Filter to projects that have known repos
      return (data ?? []).filter(
        (p: { slug: string }) => PROJECT_REPOS[p.slug]
      );
    });

    if (projects.length === 0) {
      return { status: "no_projects", message: "No projects with known repos" };
    }

    const results: Array<{
      slug: string;
      grade: string;
      score: number;
    }> = [];

    for (const project of projects) {
      const result = await step.run(`scan-${project.slug}`, async () => {
        const repoUrl = PROJECT_REPOS[project.slug];
        if (!repoUrl) return null;

        let tempDir: string | null = null;
        try {
          tempDir = mkdtempSync(join(tmpdir(), `trust-weekly-${project.slug}-`));
          execSync(`git clone --depth 1 ${repoUrl} ${tempDir}`, {
            timeout: 60_000,
            stdio: "pipe",
          });

          const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL ||
            (process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}`
              : "http://localhost:3000");

          const report = await scanProject({
            projectRoot: tempDir,
            projectSlug: project.slug,
            projectId: project.id,
            runBehavioural: false, // Layer 1 only for weekly cron
            baseUrl,
          });

          // Store
          const badgeExpiresAt = new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString();

          await supabaseAdmin.from("security_scans").insert({
            project_id: project.id,
            scan_type: "weekly_cron",
            compliance_status:
              report.overall_grade.startsWith("A") ||
              report.overall_grade.startsWith("B")
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

          console.log(
            `[trust-scan] ${project.slug}: Grade ${report.overall_grade} (${report.overall_score}/100)`
          );

          return {
            slug: project.slug,
            grade: report.overall_grade,
            score: report.overall_score,
          };
        } catch (err) {
          console.error(`[trust-scan] Failed for ${project.slug}:`, err);
          return null;
        } finally {
          if (tempDir) {
            try {
              rmSync(tempDir, { recursive: true, force: true });
            } catch {}
          }
        }
      });

      if (result) results.push(result);
    }

    return {
      status: "completed",
      projects_scanned: results.length,
      results,
    };
  }
);
