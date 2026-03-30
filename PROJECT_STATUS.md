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

### What's Next
1. **Human approval gate** — approval webhook endpoint, dashboard approval UI, timeout/fail-safe logic
2. Complete Phase 1 by wiring EasyClaudeCode + Checkpoint
3. Phase 2: Security (PubGuard integration)
4. Phase 3: Evals (golden test sets, eval runner)
5. Phase 4: Metering (instrument AI calls)
6. Phase 5: Portfolio rollout + npm publish
7. Deploy platform-trust dashboard to Vercel (queued)

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

**Last updated:** 2026-03-30T15:00:00+10:00
