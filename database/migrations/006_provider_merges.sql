CREATE TABLE IF NOT EXISTS provider_merges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_provider_id UUID NOT NULL REFERENCES providers(id),
  target_provider_id UUID NOT NULL REFERENCES providers(id),
  moderator_id UUID NOT NULL REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
