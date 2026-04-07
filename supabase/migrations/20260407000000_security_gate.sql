-- ============================================================
-- SECURITY GATE: CaMeL pipeline events, anomalies, kill switch
-- ============================================================

-- Security gate events — all pipeline activity (quarantine, planner, tool calls)
CREATE TABLE IF NOT EXISTS security_gate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  agent_id TEXT NOT NULL,
  session_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'quarantine_start',
    'quarantine_complete',
    'planner_start',
    'planner_complete',
    'tool_call',
    'tool_blocked',
    'policy_violation',
    'anomaly_detected',
    'kill_switch'
  )),
  payload JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sge_project ON security_gate_events (project_id);
CREATE INDEX idx_sge_agent ON security_gate_events (agent_id);
CREATE INDEX idx_sge_session ON security_gate_events (session_id);
CREATE INDEX idx_sge_type ON security_gate_events (event_type);
CREATE INDEX idx_sge_timestamp ON security_gate_events (timestamp DESC);

-- Anomaly alerts — flagged behavioral patterns
CREATE TABLE IF NOT EXISTS security_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  agent_id TEXT NOT NULL,
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN (
    'unusual_tool',
    'high_frequency',
    'tainted_args',
    'iteration_limit'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sa_project ON security_anomalies (project_id);
CREATE INDEX idx_sa_severity ON security_anomalies (severity);
CREATE INDEX idx_sa_unresolved ON security_anomalies (resolved) WHERE resolved = false;

-- Kill switch — remote session termination
CREATE TABLE IF NOT EXISTS security_gate_kill_switch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  agent_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  killed BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  killed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sgks_lookup ON security_gate_kill_switch (project_id, agent_id, session_id);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE security_gate_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_gate_kill_switch ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (server-side only)
CREATE POLICY "service_role_full_access_sge"
  ON security_gate_events FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_sa"
  ON security_anomalies FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_sgks"
  ON security_gate_kill_switch FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================================
-- Views for dashboard
-- ============================================================

-- Recent security events per project
CREATE OR REPLACE VIEW recent_security_events AS
SELECT
  p.name AS project_name,
  p.slug AS project_slug,
  sge.agent_id,
  sge.event_type,
  sge.payload,
  sge.timestamp
FROM security_gate_events sge
JOIN projects p ON p.id = sge.project_id
WHERE sge.timestamp > now() - interval '24 hours'
ORDER BY sge.timestamp DESC;

-- Active anomalies (unresolved)
CREATE OR REPLACE VIEW active_anomalies AS
SELECT
  p.name AS project_name,
  p.slug AS project_slug,
  sa.agent_id,
  sa.anomaly_type,
  sa.severity,
  sa.details,
  sa.timestamp
FROM security_anomalies sa
JOIN projects p ON p.id = sa.project_id
WHERE sa.resolved = false
ORDER BY
  CASE sa.severity
    WHEN 'critical' THEN 0
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
  END,
  sa.timestamp DESC;

-- Security summary per project (last 7 days)
CREATE OR REPLACE VIEW security_summary AS
SELECT
  p.name AS project_name,
  p.slug AS project_slug,
  COUNT(*) FILTER (WHERE sge.event_type = 'tool_call') AS tool_calls,
  COUNT(*) FILTER (WHERE sge.event_type = 'tool_blocked') AS tool_blocks,
  COUNT(*) FILTER (WHERE sge.event_type = 'policy_violation') AS violations,
  COUNT(*) FILTER (WHERE sge.event_type = 'kill_switch') AS kills,
  COUNT(*) FILTER (WHERE sge.event_type = 'quarantine_start') AS quarantine_runs
FROM projects p
LEFT JOIN security_gate_events sge
  ON sge.project_id = p.id
  AND sge.timestamp > now() - interval '7 days'
GROUP BY p.id, p.name, p.slug
ORDER BY tool_blocks DESC, violations DESC;
