# platform-trust — PROJECT.md
> Universal trust, security, and observability layer for the Corporate AI Solutions platform portfolio
> Formatted for Claude Code ingestion

---

## 1. PURPOSE

Every project in the portfolio (Store MCP / Agent Storefront, EasyClaudeCode, Checkpoint, RaiseReady, Connexions, DealFindrs, TenderWatch, LaunchReady, F2K) shares infrastructure but currently has no shared trust layer.

`platform-trust` is a standalone repo + shared Supabase schema that every project imports. It provides six modules:

| Module | What it does |
|---|---|
| **Security** | Automated vulnerability scanning, attack surface reporting, compliance evidence |
| **Evals** | Agent response quality scoring, degradation detection, golden test sets |
| **Observability** | Structured audit logging of every agent action that touches data |
| **Metering** | Per-project, per-client token and compute cost tracking |
| **Permission Governance** | Scoped read/write access, human-in-the-loop gates, token rotation |
| **Rate Limiting** | Per-agent/token burst, sustained, and budget-based rate enforcement |

This is the **brakes layer**. It ships before or alongside any project going into enterprise/production use.

---

## 2. STRATEGIC CONTEXT

### Why this exists
The Meta Sev1 incident (March 2026) — a rogue agent posting to internal forums and exposing data without human approval — is the canonical failure mode this layer prevents. 47% of enterprises are already seeing unauthorized agent behaviour.

For Store MCP specifically: the `create_booking` tool is a write-operation endpoint. Any enterprise procurement agent connecting to it in Phase 2 will require documented permission boundaries, audit trails, and compliance evidence before sign-off. `platform-trust` is that documentation made real.

### Competitive moat
Being the endpoint agents connect to (not the orchestrator) is already a defensible position. A visible, auditable trust layer makes it a *verifiable* position — differentiating from generic agent platforms that have no demonstrated security outcomes.

### Australian compliance context
- Australian Privacy Act 1988 (APP compliance)
- OWASP Top 10 for agentic/API surfaces
- GDPR overlap for any EU-connected buyers
- QBCC / ABN credential handling in Store MCP profiles counts as PII

---

## 3. ARCHITECTURE

### Repository
`platform-trust` — standalone TypeScript/Node service on Vercel (Next.js 16).
Separate from all product repos. Other projects install `@platform-trust/middleware` from this repo.
Reads/writes to shared Supabase Postgres instance.

### Shared Supabase schema
All tables are project-scoped via `project_id` foreign key. No cross-project data leakage.

```
projects
  id, name, slug, created_at

audit_log
  id, project_id, session_id, agent_id, tool_name,
  operation_type (read|write|delete),
  input_hash, output_hash, status, duration_ms,
  requires_human_approval, approved_by, approved_at,
  created_at

eval_runs
  id, project_id, agent_id, run_at,
  test_set_version, score (0-100),
  pass_count, fail_count, degradation_delta,
  flagged (bool)

eval_test_cases
  id, project_id, agent_id, input, expected_output,
  scoring_rubric (JSON), created_at, is_active

security_scans
  id, project_id, repo_url, scan_type,
  triggered_by (pr|deploy|scheduled|manual),
  findings (JSON), severity_summary (JSON),
  compliance_status, report_url, created_at

metering_events
  id, project_id, session_id, agent_id,
  model, input_tokens, output_tokens,
  cost_usd, created_at

permission_policies
  id, project_id, agent_id, scope,
  operation (read|write|delete),
  requires_approval (bool), approval_roles (JSON),
  created_at, updated_at

api_tokens
  id, project_id, name, token_hash,
  scopes (JSON), expires_at, last_used_at,
  rotated_at, revoked (bool)

rate_limits
  id, project_id, agent_id, token_id,
  window_type (minute|hour|day),
  max_requests, max_tokens,
  current_count, window_start,
  created_at, updated_at
```

---

## 4. MODULE SPECIFICATIONS

---

### MODULE 1: SECURITY

**Purpose:** Automated vulnerability detection + compliance evidence generation.
PubGuard (previously at kira-rho.vercel.app/pubguard/scan) is integrated directly into this package as the scanning engine.

**Trigger points:**
- Pull request merge (GitHub webhook)
- Deploy event (Vercel webhook)
- Weekly scheduled scan (cron)
- Manual scan via platform-trust dashboard

**What is scanned:**
- Dependency audit (npm audit / Snyk)
- Secret exposure check (no API keys, tokens, credentials in code)
- API endpoint enumeration — classify each as read/write, auth-required/open
- Agent tool operation types — flag any write/delete tools lacking approval gates
- OWASP Top 10 checklist for API surfaces
- MCP tool permission surface (specific to Store MCP)

**Outputs:**
- `security_scans` record with findings JSON
- Severity summary: `{ critical: N, high: N, medium: N, low: N }`
- Compliance status: `PASS | FAIL | REVIEW_REQUIRED`
- Downloadable PDF compliance report (for enterprise buyer sign-off)
- Public compliance badge per project (URL: `platform-trust.vercel.app/badge/{project_slug}`)

**Compliance targets:**
- Australian Privacy Act APP 11 (security of personal information)
- OWASP ASVS Level 2 for API surfaces
- SOC 2 Type II evidence trail (for future enterprise sales)

---

### MODULE 2: EVALS

**Purpose:** Detect agent quality degradation before it reaches users or clients.

**Core principle (Karpathy Loop):**
Replace subjective judgment with binary scoring checklists. 3–6 yes/no questions per eval. One change per iteration. The quality of the test set is the actual bottleneck — invest here first.

**Per-agent test set structure:**
```json
{
  "agent_id": "store-mcp-search-provider",
  "test_cases": [
    {
      "input": "Find plumbers in Brisbane under $150/hr with same-day availability",
      "expected": {
        "result_count_min": 1,
        "fields_present": ["provider_name", "hourly_rate", "availability_slots", "justification_summary"],
        "justification_not_empty": true,
        "rate_within_constraint": true
      },
      "scoring_rubric": {
        "q1": "Did the agent return at least one result?",
        "q2": "Are all required fields present in every result?",
        "q3": "Is every returned result within the stated rate constraint?",
        "q4": "Is the justification_summary non-empty and specific?",
        "q5": "Did the agent complete without timeout or error?",
        "q6": "Is the result deterministic across 3 runs?"
      }
    }
  ]
}
```

**Scoring:**
- Each rubric question = 1 point
- Score = (pass_count / total_questions) × 100
- Degradation delta = current_score − previous_score
- Alert threshold: delta < −10 in any single run, or score < 80 sustained over 3 runs

**Run triggers:**
- Post-deploy (automatic)
- Daily scheduled run per active agent
- Manual run via dashboard

**Dashboard view per agent:**
- Score over time (line chart)
- Last 5 run summaries
- Flagged cases with diff view (expected vs. actual)
- Alert status

**Golden test set governance:**
- Test cases are versioned in `eval_test_cases` table
- Changes to test cases require a `test_set_version` bump
- Score comparisons only valid within same version

---

### MODULE 3: OBSERVABILITY

**Purpose:** Structured, immutable audit log of every agent action that touches data.

**What gets logged:**
Every MCP tool call, API call, or agent-initiated operation that reads, writes, or deletes data.

**Log entry fields:**
```json
{
  "project_id": "store-mcp",
  "session_id": "sess_abc123",
  "agent_id": "procurement-agent",
  "tool_name": "create_booking",
  "operation_type": "write",
  "input_hash": "sha256:...",
  "output_hash": "sha256:...",
  "status": "completed|failed|pending_approval|rate_limited",
  "duration_ms": 342,
  "requires_human_approval": true,
  "approved_by": null,
  "approved_at": null,
  "created_at": "2026-03-30T10:00:00Z"
}
```

**Human approval gate:**
Any write/delete operation where `requires_human_approval = true` must:
1. Write to `audit_log` with `status = pending_approval`
2. Notify the designated approver (email or Slack)
3. Block execution until `approved_by` and `approved_at` are populated
4. Time out and fail-safe after configurable window (default: 24h)

**Immutability:**
`audit_log` rows are insert-only. No update or delete permitted via API. Supabase RLS policy enforces this.

**Incident reconstruction:**
In the event of a Meta-style rogue agent incident, `audit_log` provides full replay: what was called, when, by whom, with what inputs, and whether it was approved.

---

### MODULE 4: METERING

**Purpose:** Per-project, per-client cost visibility. Prevents surprise bills and enables pricing decisions.

**What is tracked:**
- Model used (claude-opus-4-6, claude-sonnet-4-6, etc.)
- Input tokens, output tokens per call
- Calculated cost in USD (using current Anthropic pricing table, stored as config)
- Project, session, agent attribution

**Aggregation views (Supabase views or materialized):**
- `daily_cost_by_project` — total spend per project per day
- `monthly_cost_by_project` — for billing/budgeting
- `cost_by_agent` — which agents are most expensive
- `cost_by_client` — if project has client_id scoping (Store MCP enterprise)

**Alerts:**
- Daily spend exceeds threshold (configurable per project)
- Single session exceeds threshold (runaway agent detection)

**Dashboard:**
- Spend to date this month per project
- Projected monthly spend (linear extrapolation)
- Cost per agent call (average)
- Budget remaining

---

### MODULE 5: PERMISSION GOVERNANCE

**Purpose:** Define and enforce what every agent is allowed to do, to which systems, with what approval required.

**Policy structure:**
```json
{
  "project_id": "store-mcp",
  "agent_id": "procurement-agent",
  "policies": [
    { "scope": "providers", "operation": "read", "requires_approval": false },
    { "scope": "availability", "operation": "read", "requires_approval": false },
    { "scope": "bookings", "operation": "write", "requires_approval": true, "approval_roles": ["client-admin"] },
    { "scope": "bookings", "operation": "delete", "requires_approval": true, "approval_roles": ["platform-admin"] }
  ]
}
```

**Enforcement:**
- All MCP tool handlers check `permission_policies` before executing write/delete operations
- Middleware layer (shared npm package) that any project can import: `import { checkPermission } from '@platform-trust/middleware'`
- Returns `{ allowed: bool, requires_approval: bool, policy_id: string }`

**Token governance:**
- All API tokens stored as hashed values only
- `expires_at` enforced — no permanent tokens in production
- `rotated_at` tracked — rotation alerts after configurable period (default: 90 days)
- Revocation immediately propagates (token checked against `revoked` flag on every call)

**Scope definitions per project (initial):**

| Project | Read scopes | Write scopes | Approval required |
|---|---|---|---|
| Store MCP | providers, availability, estimates | bookings | always |
| EasyClaudeCode | sessions, queue | queue_push, session_start | queue_push only |
| Checkpoint | projects, tasks | task_update, project_create | project_create |

---

### MODULE 6: RATE LIMITING

**Purpose:** Enforce per-agent/token request and cost ceilings to prevent runaway agents and abuse.

**Three tiers of protection:**

| Tier | Window | What it catches |
|---|---|---|
| Burst | 60 req/min per agent | Runaway loops, misconfigured retry logic |
| Sustained | 1,000 req/hr per agent | Agent doing more than intended |
| Budget | Token cost ceiling per day per project | Prevents surprise bills (enforces, not just observes) |

**Enforcement:**
- `checkRateLimit()` runs before `checkPermission()` in the middleware chain — fail fast
- Uses Supabase atomic `UPDATE ... RETURNING` for counter increments (no race conditions)
- Returns `Retry-After` header so well-behaved agents back off gracefully
- Rate limit violations logged to `audit_log` with `status = 'rate_limited'`
- Configurable per project/agent via `rate_limits` table

**Middleware integration:**
```typescript
const rateCheck = await checkRateLimit({ project_id, agent_id, token_id })
if (!rateCheck.allowed) {
  await logAuditEvent({ ...params, status: 'rate_limited' })
  throw new Error('RATE_LIMIT_EXCEEDED')
}
```

---

## 5. BUILD SEQUENCE

### Phase 0 — Foundation (Week 1)
- [ ] Scaffold `platform-trust` repo (TypeScript, Next.js 16, Vercel)
- [ ] Create shared Supabase schema (all 8 tables + rate_limits)
- [ ] Set up RLS policies (insert-only for audit_log, project-scoped reads)
- [ ] Create `@platform-trust/middleware` package skeleton

### Phase 1 — Observability + Permission Governance + Rate Limiting (Week 1–2)
- [ ] Implement `audit_log` write endpoint
- [ ] Implement `checkPermission` middleware function
- [ ] Implement `checkRateLimit` middleware function
- [ ] Connect Store MCP `create_booking` tool to all three
- [ ] Human approval gate (email notification + approval webhook)
- [ ] Test: simulate rogue write attempt, confirm it's blocked, rate-checked, and logged

### Phase 2 — Security (Week 2)
- [ ] Integrate PubGuard scanning engine into platform-trust
- [ ] Implement GitHub webhook for PR/deploy triggers
- [ ] Build compliance report PDF generator
- [ ] Build public badge endpoint (`/badge/{project_slug}`)

### Phase 3 — Evals (Week 3)
- [ ] Define golden test sets for Store MCP agents (search_providers, create_booking)
- [ ] Build eval runner (post-deploy trigger)
- [ ] Build eval dashboard (score over time, flagged cases)
- [ ] Define degradation alert threshold and notification

### Phase 4 — Metering (Week 3–4)
- [ ] Instrument all Anthropic API calls across Store MCP and EasyClaudeCode
- [ ] Build aggregation views in Supabase
- [ ] Build metering dashboard
- [ ] Configure spend alerts

### Phase 5 — Full Portfolio Integration (Ongoing)
- [ ] Publish `@platform-trust/middleware` to npm
- [ ] Add middleware to each project repo
- [ ] Define permission policies + rate limits per project
- [ ] Run first full security scan across all repos
- [ ] Produce compliance summary document for enterprise sales

---

## 6. INTEGRATION PATTERN

Every project integrates `platform-trust` via two mechanisms:

**1. Shared npm package (runtime enforcement)**
```typescript
import { checkRateLimit, checkPermission, logAuditEvent, meterCall } from '@platform-trust/middleware'

// In any MCP tool handler:
const rateCheck = await checkRateLimit({ project_id, agent_id, token_id })
if (!rateCheck.allowed) {
  await logAuditEvent({ project_id, tool_name, operation, status: 'rate_limited' })
  throw new Error('RATE_LIMIT_EXCEEDED')
}

const permission = await checkPermission({ project_id, agent_id, scope, operation })
if (!permission.allowed) {
  await logAuditEvent({ project_id, tool_name, operation, status: 'permission_denied' })
  throw new Error('PERMISSION_DENIED')
}

const result = await executeOperation()

await logAuditEvent({ project_id, tool_name, operation, input_hash, output_hash, status: 'completed' })
await meterCall({ project_id, model, input_tokens, output_tokens })
```

**2. Supabase shared schema (persistent state)**
All projects point to the same Supabase instance. Project scoping via `project_id` on every table. No project can read another project's data (RLS enforced).

---

## 7. DASHBOARD

Single URL: `platform-trust.vercel.app`

Views:
- **Portfolio overview** — all projects, compliance status, last eval score, monthly spend
- **Project drill-down** — security findings, audit log, eval history, metering, rate limit events
- **Incident view** — filtered audit log for a time range, session, or agent
- **Approval queue** — pending human approvals across all projects

Auth: Bearer token, same governance model as Store MCP.

---

## 8. FILES TO CREATE

```
platform-trust/
├── PROJECT.md                    ← this file
├── package.json
├── tsconfig.json
├── next.config.ts
├── .env.example
├── supabase/
│   ├── schema.sql                ← all 8 tables + RLS policies
│   └── seed.sql                  ← default permission policies + rate limits
├── packages/
│   └── middleware/
│       ├── package.json
│       ├── tsconfig.json
│       ├── index.ts
│       ├── checkPermission.ts
│       ├── checkRateLimit.ts
│       ├── logAuditEvent.ts
│       └── meterCall.ts
├── app/
│   ├── api/
│   │   ├── audit/route.ts
│   │   ├── eval/run/route.ts
│   │   ├── security/scan/route.ts
│   │   ├── metering/route.ts
│   │   ├── permissions/route.ts
│   │   ├── rate-limit/route.ts
│   │   └── badge/[slug]/route.ts
│   └── dashboard/
│       ├── page.tsx              ← portfolio overview
│       ├── [project]/page.tsx    ← project drill-down
│       └── approvals/page.tsx    ← approval queue
└── lib/
    ├── supabase.ts
    ├── pricing.ts                ← Anthropic token cost config
    └── compliance.ts             ← report generator
```

---

## 9. SUCCESS CRITERIA

| Milestone | Definition of done |
|---|---|
| Observability live | Every write operation in Store MCP appears in audit_log within 500ms |
| Permission gate live | A write attempt without approval is blocked and logged, not silently permitted |
| Rate limiting live | A burst of requests beyond threshold is blocked with Retry-After header |
| Security scan live | PubGuard results persist to platform-trust; compliance badge renders |
| Evals live | Post-deploy eval runs automatically; degradation alert fires on simulated regression |
| Metering live | Monthly spend visible per project with ±5% accuracy |
| Enterprise ready | Compliance report PDF generated on demand; badge URL shareable in sales process |

---

## 10. NOTES FOR CLAUDE CODE

- Next.js 16 (consistent with portfolio)
- Standalone repo — other projects install `@platform-trust/middleware` as a dependency
- Use Supabase JS client v2 (`@supabase/supabase-js`)
- All tables use UUIDs as primary keys (`gen_random_uuid()`)
- Middleware package is a local package initially (`packages/middleware`), published to npm in Phase 5
- `audit_log` RLS: authenticated users can INSERT, SELECT where `project_id` matches their token scope. No UPDATE or DELETE permitted via any role.
- Permission check must be synchronous-feeling but is async — use `await` consistently, never fire-and-forget
- Rate limit counters use atomic `UPDATE ... RETURNING` — no separate read-then-write
- Eval runner should be idempotent — safe to re-run without duplicating records
- Security scan webhook should verify GitHub/Vercel signature before processing
- All costs stored in USD to 6 decimal places (micro-transactions are real at scale)
- PubGuard scanning engine is integrated directly into this repo (not external)
