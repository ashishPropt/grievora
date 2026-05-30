CREATE TABLE IF NOT EXISTS provider_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL UNIQUE REFERENCES providers(id) ON DELETE CASCADE,
  grievance_count INTEGER NOT NULL DEFAULT 0,
  avg_severity NUMERIC(4,2) NOT NULL DEFAULT 0,
  recency_factor NUMERIC(6,4) NOT NULL DEFAULT 0,
  score NUMERIC(8,4) NOT NULL DEFAULT 0,
  last_computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_scores_score ON provider_scores(score DESC);
