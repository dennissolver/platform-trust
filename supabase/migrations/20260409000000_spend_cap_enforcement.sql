-- ============================================================
-- SPEND CAP ENFORCEMENT
-- Adds max_spend_usd to rate_limits and an RPC for checking
-- cumulative spend within a rate limit window.
-- ============================================================

-- Add spend cap column
ALTER TABLE rate_limits ADD COLUMN IF NOT EXISTS max_spend_usd NUMERIC(12,2);

-- Update ECC daily rate limit with tier-appropriate spend cap
-- Standard tier default: $5/day (matches ECC's TIER_TOKEN_BUDGETS.standard)
UPDATE rate_limits
SET max_spend_usd = 5.00, max_tokens = 10000000
WHERE project_id = '89e8f37f-ed84-443f-9463-d454d40ef1a6'
  AND window_type = 'day';

-- RPC: atomic rate limit increment (replaces fallback optimistic lock)
CREATE OR REPLACE FUNCTION increment_rate_limit(limit_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE rate_limits
  SET current_count = current_count + 1,
      updated_at = now()
  WHERE id = limit_id;
END;
$$;

-- RPC: get cumulative spend and tokens for a project within a time window
CREATE OR REPLACE FUNCTION get_window_usage(
  p_project_id UUID,
  p_window_start TIMESTAMPTZ
)
RETURNS TABLE(total_cost_usd NUMERIC, total_tokens BIGINT)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(m.cost_usd), 0)::NUMERIC AS total_cost_usd,
    COALESCE(SUM(m.input_tokens + m.output_tokens), 0)::BIGINT AS total_tokens
  FROM metering_events m
  WHERE m.project_id = p_project_id
    AND m.created_at >= p_window_start;
END;
$$;
