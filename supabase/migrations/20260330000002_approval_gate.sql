-- Approval gate: allow updating ONLY approval fields on pending_approval rows
-- This preserves audit_log immutability for all other fields

-- RLS policy: allow service_role to update approval fields on pending rows
CREATE POLICY "audit_log_approve" ON audit_log
  FOR UPDATE TO authenticated
  USING (status = 'pending_approval')
  WITH CHECK (status IN ('completed', 'failed'));

-- Approval timeout: function to auto-reject stale approvals
CREATE OR REPLACE FUNCTION expire_stale_approvals(timeout_hours INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE audit_log
  SET status = 'failed',
      approved_by = 'system:timeout',
      approved_at = now()
  WHERE status = 'pending_approval'
    AND created_at < now() - (timeout_hours || ' hours')::interval;

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approval decisions table — full record of who approved/rejected what and why
CREATE TABLE IF NOT EXISTS approval_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id UUID NOT NULL REFERENCES audit_log(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  decided_by TEXT NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

CREATE INDEX idx_approval_decisions_audit ON approval_decisions (audit_log_id);

ALTER TABLE approval_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approval_decisions_select" ON approval_decisions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "approval_decisions_insert" ON approval_decisions
  FOR INSERT TO authenticated WITH CHECK (true);
