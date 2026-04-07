-- ============================================================
-- AGENT TRUST SCORE: extend security_scans + safety coordination log
-- ============================================================

-- Extend existing security_scans table with trust score fields
ALTER TABLE security_scans ADD COLUMN IF NOT EXISTS
  agent_trust_score JSONB;
ALTER TABLE security_scans ADD COLUMN IF NOT EXISTS
  overall_grade VARCHAR(3);
ALTER TABLE security_scans ADD COLUMN IF NOT EXISTS
  overall_score INTEGER;
ALTER TABLE security_scans ADD COLUMN IF NOT EXISTS
  agent_safety_score INTEGER;
ALTER TABLE security_scans ADD COLUMN IF NOT EXISTS
  code_security_score INTEGER;
ALTER TABLE security_scans ADD COLUMN IF NOT EXISTS
  cost_governance_score INTEGER;
ALTER TABLE security_scans ADD COLUMN IF NOT EXISTS
  compliance_score INTEGER;
ALTER TABLE security_scans ADD COLUMN IF NOT EXISTS
  critical_count INTEGER DEFAULT 0;
ALTER TABLE security_scans ADD COLUMN IF NOT EXISTS
  high_count INTEGER DEFAULT 0;
ALTER TABLE security_scans ADD COLUMN IF NOT EXISTS
  medium_count INTEGER DEFAULT 0;
ALTER TABLE security_scans ADD COLUMN IF NOT EXISTS
  low_count INTEGER DEFAULT 0;
ALTER TABLE security_scans ADD COLUMN IF NOT EXISTS
  badge_expires_at TIMESTAMPTZ;

-- Safety coordination log (AS-09)
CREATE TABLE IF NOT EXISTS safety_coordination_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  session_id TEXT,
  agent_id TEXT,
  refusal_reason TEXT,
  request_summary TEXT,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scl_project ON safety_coordination_log (project_id);
CREATE INDEX idx_scl_agent ON safety_coordination_log (agent_id);

ALTER TABLE safety_coordination_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_scl"
  ON safety_coordination_log FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================================
-- Dashboard Views
-- ============================================================

-- Latest trust score per project
CREATE OR REPLACE VIEW trust_score_latest AS
SELECT DISTINCT ON (ss.project_id)
  p.name AS project_name,
  p.slug AS project_slug,
  ss.overall_grade,
  ss.overall_score,
  ss.agent_safety_score,
  ss.code_security_score,
  ss.cost_governance_score,
  ss.compliance_score,
  ss.critical_count,
  ss.high_count,
  ss.badge_expires_at,
  ss.created_at AS scan_date
FROM security_scans ss
JOIN projects p ON p.id = ss.project_id
WHERE ss.overall_grade IS NOT NULL
ORDER BY ss.project_id, ss.created_at DESC;

-- Trust score trend per project (last 10 scans)
CREATE OR REPLACE VIEW trust_score_trend AS
SELECT
  p.slug AS project_slug,
  ss.overall_grade,
  ss.overall_score,
  ss.agent_safety_score,
  ss.code_security_score,
  ss.cost_governance_score,
  ss.compliance_score,
  ss.created_at AS scan_date
FROM security_scans ss
JOIN projects p ON p.id = ss.project_id
WHERE ss.overall_grade IS NOT NULL
  AND ss.created_at > now() - interval '90 days'
ORDER BY p.slug, ss.created_at DESC;
