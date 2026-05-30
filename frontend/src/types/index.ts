export interface User {
  id: string;
  email?: string;
  username: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  points: number;
}

export interface Provider {
  id: string;
  name: string;
  service_area: string;
  website?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  status: 'VERIFIED' | 'UNVERIFIED';
  score?: number;
  grievance_count?: number;
  avg_severity?: number;
  created_at: string;
}

export interface Grievance {
  id: string;
  user_id?: string;
  provider_id?: string;
  provider_name?: string;
  service_area: string;
  summary?: string;
  raw_text?: string;
  category?: string;
  severity: number;
  incident_date?: string;
  status: 'PENDING_MODERATION' | 'APPROVED' | 'REJECTED';
  is_anonymous: boolean;
  submitter_username?: string;
  llm_risk_score?: number;
  llm_flags?: string[];
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
