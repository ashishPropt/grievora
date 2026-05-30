CREATE TABLE IF NOT EXISTS grievances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES providers(id),
  service_area VARCHAR(50) NOT NULL,
  raw_text TEXT NOT NULL,
  summary TEXT,
  category VARCHAR(50),
  severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
  incident_date DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_MODERATION'
    CHECK (status IN ('PENDING_MODERATION', 'APPROVED', 'REJECTED')),
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  evidence_urls JSONB DEFAULT '[]',
  llm_risk_score NUMERIC(4,2),
  llm_flags JSONB DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  previous_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grievances_provider ON grievances(provider_id);
CREATE INDEX IF NOT EXISTS idx_grievances_user ON grievances(user_id);
CREATE INDEX IF NOT EXISTS idx_grievances_status ON grievances(status);
CREATE INDEX IF NOT EXISTS idx_grievances_created ON grievances(created_at DESC);
