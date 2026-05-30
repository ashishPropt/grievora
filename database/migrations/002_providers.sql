CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(500) NOT NULL,
  service_area VARCHAR(50) NOT NULL,
  website VARCHAR(500),
  phone VARCHAR(50),
  email VARCHAR(255),
  address_line1 VARCHAR(500),
  address_line2 VARCHAR(500),
  city VARCHAR(255),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'US',
  postal_code VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'UNVERIFIED' CHECK (status IN ('VERIFIED', 'UNVERIFIED')),
  external_refs JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_providers_name ON providers USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_providers_service_area ON providers(service_area);
CREATE INDEX IF NOT EXISTS idx_providers_city_state ON providers(city, state);
