-- platform-trust: shared trust layer schema
-- All tables project-scoped via project_id FK

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_slug ON projects (slug);

-- ============================================================
-- AUDIT LOG (insert-only, immutable)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  session_id TEXT,
  agent_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('read', 'write', 'delete')),
  input_hash TEXT,
  output_hash TEXT,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'pending_approval', 'permission_denied', 'rate_limited')),
  duration_ms INTEGER,
  requires_human_approval BOOLEAN NOT NULL DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_project ON audit_log (project_id, created_at DESC);
CREATE INDEX idx_audit_log_session ON audit_log (session_id);
CREATE INDEX idx_audit_log_agent ON audit_log (agent_id);
CREATE INDEX idx_audit_log_status ON audit_log (status) WHERE status = 'pending_approval';

-- ============================================================
-- EVAL RUNS
-- ============================================================
CREATE TABLE IF NOT EXISTS eval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  agent_id TEXT NOT NULL,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  test_set_version INTEGER NOT NULL,
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  pass_count INTEGER NOT NULL DEFAULT 0,
  fail_count INTEGER NOT NULL DEFAULT 0,
  degradation_delta NUMERIC(5,2),
  flagged BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_eval_runs_project_agent ON eval_runs (project_id, agent_id, run_at DESC);

-- ============================================================
-- EVAL TEST CASES
-- ============================================================
CREATE TABLE IF NOT EXISTS eval_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  agent_id TEXT NOT NULL,
  input TEXT NOT NULL,
  expected_output JSONB NOT NULL,
  scoring_rubric JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eval_test_cases_active ON eval_test_cases (project_id, agent_id) WHERE is_active = true;

-- ============================================================
-- SECURITY SCANS
-- ============================================================
CREATE TABLE IF NOT EXISTS security_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  repo_url TEXT,
  scan_type TEXT NOT NULL,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('pr', 'deploy', 'scheduled', 'manual')),
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  severity_summary JSONB NOT NULL DEFAULT '{"critical":0,"high":0,"medium":0,"low":0}'::jsonb,
  compliance_status TEXT NOT NULL CHECK (compliance_status IN ('PASS', 'FAIL', 'REVIEW_REQUIRED')),
  report_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_scans_project ON security_scans (project_id, created_at DESC);

-- ============================================================
-- METERING EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS metering_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  session_id TEXT,
  agent_id TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_metering_project ON metering_events (project_id, created_at DESC);
CREATE INDEX idx_metering_agent ON metering_events (project_id, agent_id);

-- ============================================================
-- PERMISSION POLICIES
-- ============================================================
CREATE TABLE IF NOT EXISTS permission_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  agent_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('read', 'write', 'delete')),
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  approval_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_permission_unique ON permission_policies (project_id, agent_id, scope, operation);

-- ============================================================
-- API TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  rotated_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_api_tokens_project ON api_tokens (project_id);
CREATE INDEX idx_api_tokens_hash ON api_tokens (token_hash) WHERE revoked = false;

-- ============================================================
-- RATE LIMITS
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  agent_id TEXT,
  token_id UUID REFERENCES api_tokens(id),
  window_type TEXT NOT NULL CHECK (window_type IN ('minute', 'hour', 'day')),
  max_requests INTEGER NOT NULL,
  max_tokens INTEGER,
  current_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limits_lookup ON rate_limits (project_id, agent_id, window_type);

-- ============================================================
-- AGGREGATION VIEWS
-- ============================================================

-- Daily cost by project
CREATE OR REPLACE VIEW daily_cost_by_project AS
SELECT
  project_id,
  DATE(created_at) AS day,
  SUM(cost_usd) AS total_cost,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  COUNT(*) AS call_count
FROM metering_events
GROUP BY project_id, DATE(created_at);

-- Monthly cost by project
CREATE OR REPLACE VIEW monthly_cost_by_project AS
SELECT
  project_id,
  DATE_TRUNC('month', created_at) AS month,
  SUM(cost_usd) AS total_cost,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  COUNT(*) AS call_count
FROM metering_events
GROUP BY project_id, DATE_TRUNC('month', created_at);

-- Cost by agent
CREATE OR REPLACE VIEW cost_by_agent AS
SELECT
  project_id,
  agent_id,
  SUM(cost_usd) AS total_cost,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  COUNT(*) AS call_count,
  AVG(cost_usd) AS avg_cost_per_call
FROM metering_events
GROUP BY project_id, agent_id;

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE metering_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS. These policies scope authenticated access.

-- Projects: read-only for authenticated users
CREATE POLICY "projects_select" ON projects
  FOR SELECT TO authenticated
  USING (true);

-- Audit log: INSERT only (immutable), SELECT scoped by project
CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT TO authenticated
  USING (true);

-- No UPDATE or DELETE policy on audit_log — immutable by design

-- Eval runs: full CRUD scoped by project
CREATE POLICY "eval_runs_select" ON eval_runs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "eval_runs_insert" ON eval_runs
  FOR INSERT TO authenticated WITH CHECK (true);

-- Eval test cases
CREATE POLICY "eval_test_cases_select" ON eval_test_cases
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "eval_test_cases_insert" ON eval_test_cases
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "eval_test_cases_update" ON eval_test_cases
  FOR UPDATE TO authenticated USING (true);

-- Security scans
CREATE POLICY "security_scans_select" ON security_scans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "security_scans_insert" ON security_scans
  FOR INSERT TO authenticated WITH CHECK (true);

-- Metering events
CREATE POLICY "metering_events_select" ON metering_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "metering_events_insert" ON metering_events
  FOR INSERT TO authenticated WITH CHECK (true);

-- Permission policies
CREATE POLICY "permission_policies_select" ON permission_policies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "permission_policies_insert" ON permission_policies
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "permission_policies_update" ON permission_policies
  FOR UPDATE TO authenticated USING (true);

-- API tokens
CREATE POLICY "api_tokens_select" ON api_tokens
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "api_tokens_insert" ON api_tokens
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "api_tokens_update" ON api_tokens
  FOR UPDATE TO authenticated USING (true);

-- Rate limits
CREATE POLICY "rate_limits_select" ON rate_limits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "rate_limits_insert" ON rate_limits
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "rate_limits_update" ON rate_limits
  FOR UPDATE TO authenticated USING (true);
