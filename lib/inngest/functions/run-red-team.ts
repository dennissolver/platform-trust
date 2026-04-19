/**
 * Scheduled Red Team Runner
 *
 * Runs nightly (or on-demand) against all registered AI endpoints.
 * Stores results in Supabase, detects regressions, alerts on failures.
 *
 * Schedule: Every night at 2am AEST (16:00 UTC)
 * On-demand: Send event "red-team/run.requested"
 */

import { inngest } from "../client";
import { supabaseAdmin } from "../../supabase";
import {
  createRedTeamRunner,
  EndpointRegistry,
  RedTeamReporter,
} from "@caistech/security-gate/red-team";
import type { ModelCallFn } from "@caistech/security-gate/types";
import type { RegisteredEndpoint } from "@caistech/security-gate/red-team/types";

/**
 * Create a ModelCallFn that calls an HTTP endpoint.
 * Used for testing endpoints that expose an HTTP API.
 */
function createHttpModelCaller(
  url: string,
  method = "POST"
): ModelCallFn {
  return async (opts) => {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: opts.system,
        messages: opts.messages,
        max_tokens: opts.maxTokens ?? 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    return {
      text: data.text ?? data.content ?? data.response ?? "",
      usage: data.usage ?? { inputTokens: 0, outputTokens: 0 },
    };
  };
}

export const runRedTeam = inngest.createFunction(
  {
    id: "run-red-team",
    name: "Scheduled Red Team Security Scan",
    retries: 1,
    triggers: [
      // Nightly at 2am AEST (16:00 UTC)
      { cron: "0 16 * * *" },
      // On-demand trigger
      { event: "red-team/run.requested" },
    ],
  },
  async ({ event, step }: { event: { data?: Record<string, unknown> }; step: any }) => {
    const registry = new EndpointRegistry(supabaseAdmin);
    const reporter = new RedTeamReporter(supabaseAdmin);

    // Optionally filter to a specific project or endpoint
    const targetProjectId = event?.data?.projectId as string | undefined;
    const targetEndpointId = event?.data?.endpointId as string | undefined;

    // 1. Load registered endpoints
    const allEndpoints = await step.run("load-endpoints", async () => {
      const endpoints = targetProjectId
        ? await registry.getByProject(targetProjectId)
        : await registry.getAll();

      if (targetEndpointId) {
        return endpoints.filter((e) => e.id === targetEndpointId);
      }
      return endpoints;
    });

    if (allEndpoints.length === 0) {
      return { status: "no_endpoints", message: "No endpoints registered" };
    }

    // 2. Run probes against each endpoint
    const runResults: Array<{
      endpoint: string;
      score: number;
      passed: number;
      failed: number;
      regression: boolean;
    }> = [];

    for (const endpoint of allEndpoints) {
      const result = await step.run(
        `red-team-${endpoint.id}`,
        async () => {
          // Get previous run for regression detection
          const previousRun = await reporter.getLastRun(endpoint.id);

          // Create model caller
          const modelCallFn = resolveModelCaller(endpoint);
          if (!modelCallFn) {
            console.warn(
              `[red-team] Skipping ${endpoint.id}: no URL or modelCallFn configured`
            );
            return null;
          }

          // Create runner
          const runner = createRedTeamRunner({
            modelCallFn,
            systemPrompt: endpoint.systemPrompt ?? "You are a helpful assistant.",
            projectId: endpoint.project_id,
            endpointId: endpoint.id,
            concurrency: 2, // conservative to avoid rate limits
            probeTimeoutMs: 30_000,
            previousRun: previousRun ?? undefined,
          });

          // Run probes (filtered by endpoint's configured categories)
          const report = await runner.run(endpoint.categories ?? undefined);

          // Save results
          await reporter.saveRun(report);

          // Log summary
          console.log(
            `[red-team] ${endpoint.project_name}/${endpoint.name}: ` +
              `Score ${report.run.score}/100 | ` +
              `${report.run.passed}P ${report.run.failed}F ${report.run.inconclusive}I` +
              (report.run.regression ? " | REGRESSION" : "")
          );

          return {
            endpoint: `${endpoint.project_name}/${endpoint.name}`,
            score: report.run.score,
            passed: report.run.passed,
            failed: report.run.failed,
            regression: report.run.regression,
          };
        }
      );

      if (result) {
        runResults.push(result);
      }
    }

    // 3. Check for critical results that need alerts
    const regressions = runResults.filter((r: { regression: boolean }) => r.regression);
    const lowScores = runResults.filter((r: { score: number }) => r.score < 70);

    if (regressions.length > 0 || lowScores.length > 0) {
      await step.run("alert-on-failures", async () => {
        // Log alerts (Slack/email integration can be added here)
        if (regressions.length > 0) {
          console.error(
            `[red-team] REGRESSIONS DETECTED in: ${regressions.map((r) => r.endpoint).join(", ")}`
          );
        }
        if (lowScores.length > 0) {
          console.error(
            `[red-team] LOW SCORES: ${lowScores.map((r) => `${r.endpoint} (${r.score}/100)`).join(", ")}`
          );
        }

        // Store alert in security_anomalies for dashboard visibility
        for (const reg of regressions) {
          await supabaseAdmin.from("security_anomalies").insert({
            project_id: allEndpoints.find(
              (e: RegisteredEndpoint) => `${e.project_name}/${e.name}` === reg.endpoint
            )?.project_id,
            agent_id: "red-team-runner",
            anomaly_type: "tainted_args", // reusing type for now
            severity: "high",
            details: `Red team regression: ${reg.endpoint} score dropped. ${reg.failed} probes now failing.`,
          } as never);
        }
      });
    }

    return {
      status: "completed",
      endpoints_tested: runResults.length,
      results: runResults,
      regressions: regressions.length,
      lowest_score: Math.min(...runResults.map((r) => r.score)),
    };
  }
);

function resolveModelCaller(
  endpoint: RegisteredEndpoint
): ModelCallFn | null {
  // In-memory model call function takes priority
  if (endpoint.modelCallFn) return endpoint.modelCallFn;

  // Fall back to HTTP endpoint
  if (endpoint.url) {
    return createHttpModelCaller(endpoint.url, endpoint.method);
  }

  return null;
}
