-- Seed: default projects and permission policies

-- ============================================================
-- PROJECTS
-- ============================================================
INSERT INTO projects (name, slug) VALUES
  ('Store MCP', 'store-mcp'),
  ('EasyClaudeCode', 'easy-claude-code'),
  ('Checkpoint', 'checkpoint'),
  ('RaiseReady', 'raise-ready'),
  ('Connexions', 'connexions'),
  ('DealFindrs', 'dealfindrs'),
  ('TenderWatch', 'tenderwatch'),
  ('LaunchReady', 'launchready'),
  ('F2K', 'f2k')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- PERMISSION POLICIES — Store MCP
-- ============================================================
INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles)
SELECT p.id, 'procurement-agent', 'providers', 'read', false, '[]'::jsonb
FROM projects p WHERE p.slug = 'store-mcp'
ON CONFLICT DO NOTHING;

INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles)
SELECT p.id, 'procurement-agent', 'availability', 'read', false, '[]'::jsonb
FROM projects p WHERE p.slug = 'store-mcp'
ON CONFLICT DO NOTHING;

INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles)
SELECT p.id, 'procurement-agent', 'estimates', 'read', false, '[]'::jsonb
FROM projects p WHERE p.slug = 'store-mcp'
ON CONFLICT DO NOTHING;

INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles)
SELECT p.id, 'procurement-agent', 'bookings', 'write', true, '["client-admin"]'::jsonb
FROM projects p WHERE p.slug = 'store-mcp'
ON CONFLICT DO NOTHING;

INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles)
SELECT p.id, 'procurement-agent', 'bookings', 'delete', true, '["platform-admin"]'::jsonb
FROM projects p WHERE p.slug = 'store-mcp'
ON CONFLICT DO NOTHING;

-- ============================================================
-- PERMISSION POLICIES — EasyClaudeCode
-- ============================================================
INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles)
SELECT p.id, 'session-agent', 'sessions', 'read', false, '[]'::jsonb
FROM projects p WHERE p.slug = 'easy-claude-code'
ON CONFLICT DO NOTHING;

INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles)
SELECT p.id, 'session-agent', 'queue', 'read', false, '[]'::jsonb
FROM projects p WHERE p.slug = 'easy-claude-code'
ON CONFLICT DO NOTHING;

INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles)
SELECT p.id, 'session-agent', 'queue_push', 'write', true, '["queue-admin"]'::jsonb
FROM projects p WHERE p.slug = 'easy-claude-code'
ON CONFLICT DO NOTHING;

INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles)
SELECT p.id, 'session-agent', 'session_start', 'write', false, '[]'::jsonb
FROM projects p WHERE p.slug = 'easy-claude-code'
ON CONFLICT DO NOTHING;

-- ============================================================
-- PERMISSION POLICIES — Checkpoint
-- ============================================================
INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles)
SELECT p.id, 'project-agent', 'projects', 'read', false, '[]'::jsonb
FROM projects p WHERE p.slug = 'checkpoint'
ON CONFLICT DO NOTHING;

INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles)
SELECT p.id, 'project-agent', 'tasks', 'read', false, '[]'::jsonb
FROM projects p WHERE p.slug = 'checkpoint'
ON CONFLICT DO NOTHING;

INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles)
SELECT p.id, 'project-agent', 'task_update', 'write', false, '[]'::jsonb
FROM projects p WHERE p.slug = 'checkpoint'
ON CONFLICT DO NOTHING;

INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles)
SELECT p.id, 'project-agent', 'project_create', 'write', true, '["project-admin"]'::jsonb
FROM projects p WHERE p.slug = 'checkpoint'
ON CONFLICT DO NOTHING;

-- ============================================================
-- DEFAULT RATE LIMITS — per project
-- ============================================================
-- Store MCP: strict limits (enterprise-facing)
INSERT INTO rate_limits (project_id, agent_id, window_type, max_requests, max_tokens)
SELECT p.id, '*', 'minute', 60, NULL FROM projects p WHERE p.slug = 'store-mcp'
ON CONFLICT DO NOTHING;

INSERT INTO rate_limits (project_id, agent_id, window_type, max_requests, max_tokens)
SELECT p.id, '*', 'hour', 1000, NULL FROM projects p WHERE p.slug = 'store-mcp'
ON CONFLICT DO NOTHING;

INSERT INTO rate_limits (project_id, agent_id, window_type, max_requests, max_tokens)
SELECT p.id, '*', 'day', 10000, 5000000 FROM projects p WHERE p.slug = 'store-mcp'
ON CONFLICT DO NOTHING;

-- EasyClaudeCode: moderate limits
INSERT INTO rate_limits (project_id, agent_id, window_type, max_requests, max_tokens)
SELECT p.id, '*', 'minute', 120, NULL FROM projects p WHERE p.slug = 'easy-claude-code'
ON CONFLICT DO NOTHING;

INSERT INTO rate_limits (project_id, agent_id, window_type, max_requests, max_tokens)
SELECT p.id, '*', 'hour', 2000, NULL FROM projects p WHERE p.slug = 'easy-claude-code'
ON CONFLICT DO NOTHING;

INSERT INTO rate_limits (project_id, agent_id, window_type, max_requests, max_tokens)
SELECT p.id, '*', 'day', 20000, 10000000 FROM projects p WHERE p.slug = 'easy-claude-code'
ON CONFLICT DO NOTHING;
