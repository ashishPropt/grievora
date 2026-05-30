export enum UserRole {
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

export enum GrievanceStatus {
  PENDING_MODERATION = 'PENDING_MODERATION',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ProviderStatus {
  VERIFIED = 'VERIFIED',
  UNVERIFIED = 'UNVERIFIED',
}

export enum ServiceArea {
  LEGAL = 'LEGAL',
  MEDICAL = 'MEDICAL',
  CONTRACTOR = 'CONTRACTOR',
}

export enum GrievanceCategory {
  BILLING = 'BILLING',
  MISCONDUCT = 'MISCONDUCT',
  DELAY = 'DELAY',
  COMMUNICATION = 'COMMUNICATION',
  OTHER = 'OTHER',
}

export enum ModerationActionType {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  EDIT = 'EDIT',
  REDACT = 'REDACT',
}

export enum ChatStep {
  SERVICE_AREA = 'SERVICE_AREA',
  PROVIDER_NAME = 'PROVIDER_NAME',
  PROVIDER_LOCATION = 'PROVIDER_LOCATION',
  WHAT_HAPPENED = 'WHAT_HAPPENED',
  WHEN_HAPPENED = 'WHEN_HAPPENED',
  SEVERITY = 'SEVERITY',
  EVIDENCE = 'EVIDENCE',
  IDENTITY = 'IDENTITY',
  COMPLETE = 'COMPLETE',
}

export interface User {
  id: string;
  email?: string;
  username: string;
  role: UserRole;
  points: number;
  created_at: Date;
  updated_at: Date;
}

export interface Provider {
  id: string;
  name: string;
  service_area: ServiceArea;
  website?: string;
  phone?: string;
  email?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  status: ProviderStatus;
  external_refs?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface Grievance {
  id: string;
  user_id?: string;
  provider_id?: string;
  service_area: ServiceArea;
  raw_text: string;
  summary?: string;
  category?: GrievanceCategory;
  severity: number;
  incident_date?: string;
  status: GrievanceStatus;
  is_anonymous: boolean;
  evidence_urls?: string[];
  llm_risk_score?: number;
  llm_flags?: string[];
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface ChatState {
  step: ChatStep;
  completed: boolean;
  service_area?: string;
  provider_name?: string;
  provider_city?: string;
  provider_state?: string;
  incident_date?: string;
  severity?: number;
  description?: string;
  evidence_urls?: string[];
  is_anonymous?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  user_id?: string;
  messages: ChatMessage[];
  state: ChatState;
  grievance_id?: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ProviderScore {
  provider_id: string;
  grievance_count: number;
  avg_severity: number;
  recency_factor: number;
  score: number;
  last_computed_at: Date;
}

export interface AuthenticatedRequest extends Express.Request {
  user?: User;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      correlationId?: string;
    }
  }
}
