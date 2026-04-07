# Platform Trust — Project Status

## Current State: Phase 1 In Progress

### What's Done

#### Phase 0 — Foundation (COMPLETE)
- [x] Repo scaffolded: `Corporate-AI-Solutions/platform-trust` (Next.js 15, TypeScript)
- [x] Supabase project live: `ggwveltavnvvscgqekhy` (Sydney, ap-southeast-2)
- [x] 8 tables created: projects, audit_log, eval_runs, eval_test_cases, security_scans, metering_events, permission_policies, api_tokens, rate_limits
- [x] 3 aggregation views: daily_cost_by_project, monthly_cost_by_project, cost_by_agent
- [x] RLS policies: audit_log insert-only (immutable), all tables project-scoped
- [x] Middleware package: `packages/middleware/` — checkRateLimit, checkPermission, logAuditEvent, meterCall
- [x] 7 API routes: audit, permissions, rate-limit, metering, security/scan, eval/run, badge/[slug]
- [x] 3 dashboard pages: portfolio overview, project drill-down, approval queue
- [x] 9 portfolio projects seeded with permission policies and rate limits

#### Phase 1 — Observability + Permission Governance + Rate Limiting (PARTIAL)
- [x] Store MCP: all 5 tools wired through trustGate + trustLog
  - search_providers (read/providers)
  - get_provider_detail (read/providers)
  - check_availability (read/availability)
  - create_booking (write/bookings)
  - get_whole_of_life_estimate (read/estimates)
- [x] Agent identity threaded from JWT auth → trust gate in api/mcp.ts
- [x] Vercel env vars set: PLATFORM_TRUST_SUPABASE_URL, PLATFORM_TRUST_SERVICE_KEY, PLATFORM_TRUST_PROJECT_ID
- [x] Deployed to production: https://storefront-mcp-eight.vercel.app (healthy)
- [ ] **Human approval gate** — IN PROGRESS (next task)
- [ ] Wire EasyClaudeCode through trust layer
- [ ] Wire Checkpoint through trust layer

#### Security Gate — `@platform-trust/security-gate` (COMPLETE)
- [x] CaMeL pipeline: quarantine (sandboxed LLM) → policy engine (data provenance) → planner (privileged LLM)
- [x] Input sanitizer: 14 injection pattern families
- [x] Output validator: catches smuggled instructions
- [x] Runtime monitoring: tool call logger, anomaly detector, kill switch (local + remote)
- [x] `securityGate.wrap()` single entry point for all projects
- [x] DB tables: security_gate_events, security_anomalies, security_gate_kill_switch
- [x] Dashboard views: recent_security_events, active_anomalies, security_summary

#### Red Team Runner (COMPLETE)
- [x] Probe library: 27 probes across 5 categories (prompt injection, encoding bypass, tool manipulation, data exfiltration, construction-specific)
- [x] Probe runner engine: concurrent execution, scoring, regression detection
- [x] Endpoint registry: projects register AI endpoints for testing
- [x] Reporter: stores results in Supabase, tracks score trends
- [x] Inngest cron: nightly at 2am AEST, on-demand via event trigger
- [x] DB tables: red_team_endpoints, red_team_runs, red_team_results
- [x] Dashboard views: red_team_latest_scores, red_team_recent_failures, red_team_score_trend

#### MMC Build Integration (COMPLETE)
- [x] Gate adapter: `src/lib/ai/security/gate-adapter.ts`
- [x] Compliance agent: feature-flagged via `ENABLE_SECURITY_GATE=true`
- [x] tsconfig path alias: `@platform-trust/security-gate`

### What's Next
1. Activate security gate on MMC Build (set `ENABLE_SECURITY_GATE=true` + Platform Trust env vars in Vercel)
2. Integrate security gate into MMC Build cost estimation agent
3. Register MMC Build endpoints in red-team registry
4. Deploy Platform Trust with Inngest to Vercel
5. Wire EasyClaudeCode + Checkpoint through trust layer
6. Roll out security gate to OpenClaw, F2K, other projects
7. Build dashboard UI for security events + red-team scores
8. Phase 3: Evals (golden test sets, eval runner)

### Blockers
- None

### Key References
- Platform Trust repo: https://github.com/Corporate-AI-Solutions/platform-trust
- Storefront MCP repo: https://github.com/Corporate-AI-Solutions/storefront-mcp
- Supabase dashboard: https://supabase.com/dashboard/project/ggwveltavnvvscgqekhy
- Vercel project (storefront): https://vercel.com/corporate-ai-solutions/storefront-mcp
- Store MCP project UUID: 4b0e5872-ff1e-44a2-bc80-c4ceb0925a5e

### Session Log
| Date | Duration | Summary |
|---|---|---|
| 2026-03-30 | ~90min | Phase 0 complete. Supabase live. Store MCP all 5 tools wired + deployed. Starting Phase 1 approval gate. |
| 2026-04-07 | ~120min | Built @platform-trust/security-gate: CaMeL pipeline, guardrails, runtime monitoring, kill switch. MMC Build compliance agent integrated. |
| 2026-04-08 | ~60min | Built red-team runner: 27 probes, 5 categories, Inngest nightly cron. DB migrations applied. Both projects compile clean. |

**Last updated:** 2026-04-08T12:00:00+10:00
