CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grievance_id UUID NOT NULL REFERENCES grievances(id) ON DELETE CASCADE,
  moderator_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(20) NOT NULL CHECK (action IN ('APPROVE', 'REJECT', 'EDIT', 'REDACT')),
  reason TEXT,
  changes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_grievance ON moderation_actions(grievance_id);
CREATE INDEX IF NOT EXISTS idx_moderation_moderator ON moderation_actions(moderator_id);
