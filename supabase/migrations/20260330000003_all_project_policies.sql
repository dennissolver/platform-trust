-- Permission policies for all portfolio projects
-- Scope convention: read operations are open, write/delete require approval on critical paths

-- ============================================================
-- EASY CLAUDE CODE (89e8f37f-ed84-443f-9463-d454d40ef1a6)
-- ============================================================
INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles) VALUES
  ('89e8f37f-ed84-443f-9463-d454d40ef1a6', '*', 'sessions', 'read', false, '[]'),
  ('89e8f37f-ed84-443f-9463-d454d40ef1a6', '*', 'queue', 'read', false, '[]'),
  ('89e8f37f-ed84-443f-9463-d454d40ef1a6', '*', 'projects', 'read', false, '[]'),
  ('89e8f37f-ed84-443f-9463-d454d40ef1a6', '*', 'files', 'read', false, '[]'),
  ('89e8f37f-ed84-443f-9463-d454d40ef1a6', '*', 'usage', 'read', false, '[]'),
  ('89e8f37f-ed84-443f-9463-d454d40ef1a6', '*', 'health', 'read', false, '[]'),
  ('89e8f37f-ed84-443f-9463-d454d40ef1a6', '*', 'chat', 'write', false, '[]'),
  ('89e8f37f-ed84-443f-9463-d454d40ef1a6', '*', 'execute', 'write', false, '[]'),
  ('89e8f37f-ed84-443f-9463-d454d40ef1a6', '*', 'dispatch', 'write', false, '[]'),
  ('89e8f37f-ed84-443f-9463-d454d40ef1a6', '*', 'pairing', 'write', false, '[]'),
  ('89e8f37f-ed84-443f-9463-d454d40ef1a6', '*', 'session_complete', 'write', false, '[]')
ON CONFLICT DO NOTHING;

-- Rate limits
INSERT INTO rate_limits (project_id, agent_id, window_type, max_requests, max_tokens) VALUES
  ('89e8f37f-ed84-443f-9463-d454d40ef1a6', '*', 'minute', 120, NULL),
  ('89e8f37f-ed84-443f-9463-d454d40ef1a6', '*', 'hour', 2000, NULL),
  ('89e8f37f-ed84-443f-9463-d454d40ef1a6', '*', 'day', 20000, 10000000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- CHECKPOINT / F2K-CHECKPOINT (b3cbd7d5-f3af-4ae1-acbe-c905235cd676)
-- ============================================================
INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles) VALUES
  ('b3cbd7d5-f3af-4ae1-acbe-c905235cd676', '*', 'projects', 'read', false, '[]'),
  ('b3cbd7d5-f3af-4ae1-acbe-c905235cd676', '*', 'tasks', 'read', false, '[]'),
  ('b3cbd7d5-f3af-4ae1-acbe-c905235cd676', '*', 'health', 'read', false, '[]'),
  ('b3cbd7d5-f3af-4ae1-acbe-c905235cd676', '*', 'agents', 'write', false, '[]'),
  ('b3cbd7d5-f3af-4ae1-acbe-c905235cd676', '*', 'analysis', 'write', false, '[]'),
  ('b3cbd7d5-f3af-4ae1-acbe-c905235cd676', '*', 'compliance', 'write', false, '[]'),
  ('b3cbd7d5-f3af-4ae1-acbe-c905235cd676', '*', 'billing', 'write', true, '["admin"]'),
  ('b3cbd7d5-f3af-4ae1-acbe-c905235cd676', '*', 'project_init', 'write', true, '["admin"]')
ON CONFLICT DO NOTHING;

INSERT INTO rate_limits (project_id, agent_id, window_type, max_requests, max_tokens) VALUES
  ('b3cbd7d5-f3af-4ae1-acbe-c905235cd676', '*', 'minute', 60, NULL),
  ('b3cbd7d5-f3af-4ae1-acbe-c905235cd676', '*', 'hour', 1000, NULL),
  ('b3cbd7d5-f3af-4ae1-acbe-c905235cd676', '*', 'day', 10000, 8000000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- RAISEREADY (975ae818-23e6-43a1-91b2-500330d1b606)
-- ============================================================
INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles) VALUES
  ('975ae818-23e6-43a1-91b2-500330d1b606', '*', 'datawizz', 'read', false, '[]'),
  ('975ae818-23e6-43a1-91b2-500330d1b606', '*', 'personas', 'read', false, '[]'),
  ('975ae818-23e6-43a1-91b2-500330d1b606', '*', 'datawizz', 'write', false, '[]'),
  ('975ae818-23e6-43a1-91b2-500330d1b606', '*', 'setup_infra', 'write', true, '["platform-admin"]'),
  ('975ae818-23e6-43a1-91b2-500330d1b606', '*', 'setup_config', 'write', true, '["platform-admin"]'),
  ('975ae818-23e6-43a1-91b2-500330d1b606', '*', 'setup_deploy', 'write', true, '["platform-admin"]')
ON CONFLICT DO NOTHING;

INSERT INTO rate_limits (project_id, agent_id, window_type, max_requests, max_tokens) VALUES
  ('975ae818-23e6-43a1-91b2-500330d1b606', '*', 'minute', 30, NULL),
  ('975ae818-23e6-43a1-91b2-500330d1b606', '*', 'hour', 500, NULL),
  ('975ae818-23e6-43a1-91b2-500330d1b606', '*', 'day', 5000, 5000000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- CONNEXIONS (d8bbc568-91f8-4d31-977c-c2d3e03dc164)
-- ============================================================
INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles) VALUES
  ('d8bbc568-91f8-4d31-977c-c2d3e03dc164', '*', 'interviews', 'read', false, '[]'),
  ('d8bbc568-91f8-4d31-977c-c2d3e03dc164', '*', 'panels', 'read', false, '[]'),
  ('d8bbc568-91f8-4d31-977c-c2d3e03dc164', '*', 'insights', 'read', false, '[]'),
  ('d8bbc568-91f8-4d31-977c-c2d3e03dc164', '*', 'health', 'read', false, '[]'),
  ('d8bbc568-91f8-4d31-977c-c2d3e03dc164', '*', 'demo', 'read', false, '[]'),
  ('d8bbc568-91f8-4d31-977c-c2d3e03dc164', '*', 'interviews', 'write', false, '[]'),
  ('d8bbc568-91f8-4d31-977c-c2d3e03dc164', '*', 'panels', 'write', false, '[]'),
  ('d8bbc568-91f8-4d31-977c-c2d3e03dc164', '*', 'demo', 'write', false, '[]'),
  ('d8bbc568-91f8-4d31-977c-c2d3e03dc164', '*', 'voice', 'write', false, '[]'),
  ('d8bbc568-91f8-4d31-977c-c2d3e03dc164', '*', 'webhooks', 'write', false, '[]'),
  ('d8bbc568-91f8-4d31-977c-c2d3e03dc164', '*', 'billing', 'write', true, '["admin"]'),
  ('d8bbc568-91f8-4d31-977c-c2d3e03dc164', '*', 'provision', 'write', true, '["platform-admin"]'),
  ('d8bbc568-91f8-4d31-977c-c2d3e03dc164', '*', 'admin', 'write', true, '["admin"]')
ON CONFLICT DO NOTHING;

INSERT INTO rate_limits (project_id, agent_id, window_type, max_requests, max_tokens) VALUES
  ('d8bbc568-91f8-4d31-977c-c2d3e03dc164', '*', 'minute', 120, NULL),
  ('d8bbc568-91f8-4d31-977c-c2d3e03dc164', '*', 'hour', 2000, NULL),
  ('d8bbc568-91f8-4d31-977c-c2d3e03dc164', '*', 'day', 20000, 15000000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- DEALFINDRS (00b89fa6-7b7a-4c55-b339-9beb9bdba4ae)
-- ============================================================
INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles) VALUES
  ('00b89fa6-7b7a-4c55-b339-9beb9bdba4ae', '*', 'opportunities', 'read', false, '[]'),
  ('00b89fa6-7b7a-4c55-b339-9beb9bdba4ae', '*', 'devfinance', 'read', false, '[]'),
  ('00b89fa6-7b7a-4c55-b339-9beb9bdba4ae', '*', 'health', 'read', false, '[]'),
  ('00b89fa6-7b7a-4c55-b339-9beb9bdba4ae', '*', 'opportunities', 'write', false, '[]'),
  ('00b89fa6-7b7a-4c55-b339-9beb9bdba4ae', '*', 'devfinance', 'write', false, '[]'),
  ('00b89fa6-7b7a-4c55-b339-9beb9bdba4ae', '*', 'voice', 'write', false, '[]'),
  ('00b89fa6-7b7a-4c55-b339-9beb9bdba4ae', '*', 'assessment', 'write', false, '[]'),
  ('00b89fa6-7b7a-4c55-b339-9beb9bdba4ae', '*', 'onboarding', 'write', false, '[]'),
  ('00b89fa6-7b7a-4c55-b339-9beb9bdba4ae', '*', 'webhooks', 'write', false, '[]'),
  ('00b89fa6-7b7a-4c55-b339-9beb9bdba4ae', '*', 'billing', 'write', true, '["admin"]'),
  ('00b89fa6-7b7a-4c55-b339-9beb9bdba4ae', '*', 'admin', 'write', true, '["admin"]'),
  ('00b89fa6-7b7a-4c55-b339-9beb9bdba4ae', '*', 'company', 'write', true, '["admin"]')
ON CONFLICT DO NOTHING;

INSERT INTO rate_limits (project_id, agent_id, window_type, max_requests, max_tokens) VALUES
  ('00b89fa6-7b7a-4c55-b339-9beb9bdba4ae', '*', 'minute', 60, NULL),
  ('00b89fa6-7b7a-4c55-b339-9beb9bdba4ae', '*', 'hour', 1000, NULL),
  ('00b89fa6-7b7a-4c55-b339-9beb9bdba4ae', '*', 'day', 10000, 8000000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TENDERWATCH (108c7d91-f3be-49f7-aa8d-e7aa1b9d5a50)
-- ============================================================
INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles) VALUES
  ('108c7d91-f3be-49f7-aa8d-e7aa1b9d5a50', '*', 'tenders', 'read', false, '[]'),
  ('108c7d91-f3be-49f7-aa8d-e7aa1b9d5a50', '*', 'health', 'read', false, '[]'),
  ('108c7d91-f3be-49f7-aa8d-e7aa1b9d5a50', '*', 'auth', 'write', false, '[]'),
  ('108c7d91-f3be-49f7-aa8d-e7aa1b9d5a50', '*', 'webhooks', 'write', false, '[]'),
  ('108c7d91-f3be-49f7-aa8d-e7aa1b9d5a50', '*', 'scraping', 'write', true, '["platform-admin"]'),
  ('108c7d91-f3be-49f7-aa8d-e7aa1b9d5a50', '*', 'abn_lookup', 'read', false, '[]')
ON CONFLICT DO NOTHING;

INSERT INTO rate_limits (project_id, agent_id, window_type, max_requests, max_tokens) VALUES
  ('108c7d91-f3be-49f7-aa8d-e7aa1b9d5a50', '*', 'minute', 30, NULL),
  ('108c7d91-f3be-49f7-aa8d-e7aa1b9d5a50', '*', 'hour', 500, NULL),
  ('108c7d91-f3be-49f7-aa8d-e7aa1b9d5a50', '*', 'day', 5000, 3000000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- LAUNCHREADY (f5eada16-fb2f-499f-afeb-f93f694b4827)
-- ============================================================
INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles) VALUES
  ('f5eada16-fb2f-499f-afeb-f93f694b4827', '*', 'projects', 'read', false, '[]'),
  ('f5eada16-fb2f-499f-afeb-f93f694b4827', '*', 'documents', 'read', false, '[]'),
  ('f5eada16-fb2f-499f-afeb-f93f694b4827', '*', 'health', 'read', false, '[]'),
  ('f5eada16-fb2f-499f-afeb-f93f694b4827', '*', 'ai_chat', 'write', false, '[]'),
  ('f5eada16-fb2f-499f-afeb-f93f694b4827', '*', 'ai_scan', 'write', false, '[]'),
  ('f5eada16-fb2f-499f-afeb-f93f694b4827', '*', 'documents', 'write', false, '[]'),
  ('f5eada16-fb2f-499f-afeb-f93f694b4827', '*', 'voice', 'write', false, '[]'),
  ('f5eada16-fb2f-499f-afeb-f93f694b4827', '*', 'agent', 'write', false, '[]'),
  ('f5eada16-fb2f-499f-afeb-f93f694b4827', '*', 'describe_url', 'read', false, '[]'),
  ('f5eada16-fb2f-499f-afeb-f93f694b4827', '*', 'billing', 'write', true, '["admin"]'),
  ('f5eada16-fb2f-499f-afeb-f93f694b4827', '*', 'protection', 'write', false, '[]')
ON CONFLICT DO NOTHING;

INSERT INTO rate_limits (project_id, agent_id, window_type, max_requests, max_tokens) VALUES
  ('f5eada16-fb2f-499f-afeb-f93f694b4827', '*', 'minute', 60, NULL),
  ('f5eada16-fb2f-499f-afeb-f93f694b4827', '*', 'hour', 1000, NULL),
  ('f5eada16-fb2f-499f-afeb-f93f694b4827', '*', 'day', 10000, 8000000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- F2K (b5857e0e-eb3f-4108-8f51-c430d14c6b03)
-- ============================================================
INSERT INTO permission_policies (project_id, agent_id, scope, operation, requires_approval, approval_roles) VALUES
  ('b5857e0e-eb3f-4108-8f51-c430d14c6b03', '*', 'projects', 'read', false, '[]'),
  ('b5857e0e-eb3f-4108-8f51-c430d14c6b03', '*', 'health', 'read', false, '[]'),
  ('b5857e0e-eb3f-4108-8f51-c430d14c6b03', '*', 'agents', 'write', false, '[]'),
  ('b5857e0e-eb3f-4108-8f51-c430d14c6b03', '*', 'analysis', 'write', false, '[]')
ON CONFLICT DO NOTHING;

INSERT INTO rate_limits (project_id, agent_id, window_type, max_requests, max_tokens) VALUES
  ('b5857e0e-eb3f-4108-8f51-c430d14c6b03', '*', 'minute', 60, NULL),
  ('b5857e0e-eb3f-4108-8f51-c430d14c6b03', '*', 'hour', 1000, NULL),
  ('b5857e0e-eb3f-4108-8f51-c430d14c6b03', '*', 'day', 10000, 5000000)
ON CONFLICT DO NOTHING;
