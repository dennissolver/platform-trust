-- ============================================================
-- RED TEAM: endpoint registry, runs, results
-- ============================================================

-- Registered AI endpoints for red-team testing
CREATE TABLE IF NOT EXISTS red_team_endpoints (
  id TEXT PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  project_name TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT,
  method TEXT NOT NULL DEFAULT 'POST',
  system_prompt TEXT,
  categories JSONB,
  has_tool_access BOOLEAN NOT NULL DEFAULT false,
  processes_untrusted_content BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rte_project ON red_team_endpoints (project_id);
CREATE INDEX idx_rte_active ON red_team_endpoints (active) WHERE active = true;

-- Red team runs (one per endpoint per scheduled execution)
CREATE TABLE IF NOT EXISTS red_team_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  endpoint_id TEXT NOT NULL REFERENCES red_team_endpoints(id),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  total_probes INTEGER NOT NULL,
  passed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  inconclusive INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  regression BOOLEAN NOT NULL DEFAULT false,
  summary TEXT,
  by_category JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rtr_endpoint ON red_team_runs (endpoint_id);
CREATE INDEX idx_rtr_completed ON red_team_runs (completed_at DESC);
CREATE INDEX idx_rtr_regression ON red_team_runs (regression) WHERE regression = true;

-- Individual probe results per run
CREATE TABLE IF NOT EXISTS red_team_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES red_team_runs(id) ON DELETE CASCADE,
  probe_id TEXT NOT NULL,
  probe_name TEXT NOT NULL,
  probe_category TEXT NOT NULL,
  probe_severity TEXT NOT NULL CHECK (probe_severity IN ('low', 'medium', 'high', 'critical')),
  verdict TEXT NOT NULL CHECK (verdict IN ('pass', 'fail', 'inconclusive')),
  response_preview TEXT,
  failure_matches JSONB DEFAULT '[]',
  success_matches JSONB DEFAULT '[]',
  latency_ms INTEGER,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rtres_run ON red_team_results (run_id);
CREATE INDEX idx_rtres_verdict ON red_team_results (verdict);
CREATE INDEX idx_rtres_failures ON red_team_results (verdict) WHERE verdict = 'fail';

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE red_team_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE red_team_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE red_team_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_rte"
  ON red_team_endpoints FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_rtr"
  ON red_team_runs FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_rtres"
  ON red_team_results FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================================
-- Dashboard Views
-- ============================================================

-- Latest score per endpoint
CREATE OR REPLACE VIEW red_team_latest_scores AS
SELECT DISTINCT ON (rtr.endpoint_id)
  p.name AS project_name,
  p.slug AS project_slug,
  rte.name AS endpoint_name,
  rtr.endpoint_id,
  rtr.score,
  rtr.passed,
  rtr.failed,
  rtr.inconclusive,
  rtr.regression,
  rtr.completed_at
FROM red_team_runs rtr
JOIN red_team_endpoints rte ON rte.id = rtr.endpoint_id
JOIN projects p ON p.id = rtr.project_id
ORDER BY rtr.endpoint_id, rtr.completed_at DESC;

-- Recent failures across all endpoints
CREATE OR REPLACE VIEW red_team_recent_failures AS
SELECT
  p.name AS project_name,
  rte.name AS endpoint_name,
  rtres.probe_id,
  rtres.probe_name,
  rtres.probe_category,
  rtres.probe_severity,
  rtres.response_preview,
  rtres.failure_matches,
  rtres.timestamp
FROM red_team_results rtres
JOIN red_team_runs rtr ON rtr.id = rtres.run_id
JOIN red_team_endpoints rte ON rte.id = rtr.endpoint_id
JOIN projects p ON p.id = rtr.project_id
WHERE rtres.verdict = 'fail'
  AND rtres.timestamp > now() - interval '7 days'
ORDER BY
  CASE rtres.probe_severity
    WHEN 'critical' THEN 0
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
  END,
  rtres.timestamp DESC;

-- Score trend per endpoint (last 30 runs)
CREATE OR REPLACE VIEW red_team_score_trend AS
SELECT
  rte.name AS endpoint_name,
  rtr.endpoint_id,
  rtr.score,
  rtr.regression,
  rtr.total_probes,
  rtr.failed,
  rtr.completed_at
FROM red_team_runs rtr
JOIN red_team_endpoints rte ON rte.id = rtr.endpoint_id
WHERE rtr.completed_at > now() - interval '30 days'
ORDER BY rtr.endpoint_id, rtr.completed_at DESC;
