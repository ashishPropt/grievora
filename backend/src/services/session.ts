import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import { ChatMessage, ChatSession, ChatState, ChatStep } from '../types';
import { conductIntake } from './llm';
import logger from '../utils/logger';

// ── Rule-based fallback (used when LLM is unavailable) ──────────────────────
const STEP_QUESTIONS: Record<ChatStep, string> = {
  [ChatStep.SERVICE_AREA]:       'What type of service provider is this grievance against? (e.g. **legal**, medical, contractor)',
  [ChatStep.PROVIDER_NAME]:      'What is the name of the provider (law firm, attorney, or company)?',
  [ChatStep.PROVIDER_LOCATION]:  'What city and state are they located in? (e.g. "New York, NY")',
  [ChatStep.WHAT_HAPPENED]:      'Please describe what happened in as much detail as you can.',
  [ChatStep.WHEN_HAPPENED]:      'Approximately when did this happen? (e.g. "March 2024" or a specific date)',
  [ChatStep.SEVERITY]:           'On a scale of **1 to 5**, how severe was this? (1 = minor inconvenience, 5 = severe harm)',
  [ChatStep.EVIDENCE]:           'Do you have any evidence (links, document names)? Type "none" to skip.',
  [ChatStep.IDENTITY]:           'Should your **username** be shown with this grievance, or do you want to remain **anonymous**? (reply "username" or "anonymous")',
  [ChatStep.COMPLETE]:           'Thank you! Your grievance is ready to submit. Click **Submit Grievance** below.',
};

const STEP_ORDER: ChatStep[] = [
  ChatStep.SERVICE_AREA, ChatStep.PROVIDER_NAME, ChatStep.PROVIDER_LOCATION,
  ChatStep.WHAT_HAPPENED, ChatStep.WHEN_HAPPENED, ChatStep.SEVERITY,
  ChatStep.EVIDENCE, ChatStep.IDENTITY, ChatStep.COMPLETE,
];

function nextStep(current: ChatStep): ChatStep {
  const idx = STEP_ORDER.indexOf(current);
  return STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)];
}

function ruleBasedProcess(userMessage: string, state: ChatState): { reply: string; state: ChatState } {
  const msg = userMessage.trim();
  const newState: ChatState = { ...state };

  switch (state.step) {
    case ChatStep.SERVICE_AREA:
      newState.service_area = msg.toUpperCase().includes('LEGAL') ? 'LEGAL'
        : msg.toUpperCase().includes('MED') ? 'MEDICAL'
        : msg.toUpperCase().includes('CONT') ? 'CONTRACTOR'
        : msg.toUpperCase();
      break;
    case ChatStep.PROVIDER_NAME:
      newState.provider_name = msg;
      break;
    case ChatStep.PROVIDER_LOCATION: {
      const parts = msg.split(',').map(s => s.trim());
      newState.provider_city = parts[0] || msg;
      newState.provider_state = parts[1] || '';
      break;
    }
    case ChatStep.WHAT_HAPPENED:
      newState.description = msg;
      break;
    case ChatStep.WHEN_HAPPENED:
      newState.incident_date = msg;
      break;
    case ChatStep.SEVERITY: {
      const n = parseInt(msg);
      newState.severity = (!isNaN(n) && n >= 1 && n <= 5) ? n : 3;
      break;
    }
    case ChatStep.EVIDENCE:
      if (msg.toLowerCase() !== 'none') {
        newState.evidence_urls = msg.split(/\s+/).filter(s => s.length > 3);
      }
      break;
    case ChatStep.IDENTITY:
      newState.is_anonymous = !msg.toLowerCase().includes('username');
      break;
  }

  const advanced = nextStep(state.step);
  newState.step = advanced;
  newState.completed = advanced === ChatStep.COMPLETE;

  const reply = newState.completed
    ? `✅ Got it! Here's a summary of what you've told us:\n\n` +
      `• **Provider:** ${newState.provider_name} (${newState.provider_city}, ${newState.provider_state})\n` +
      `• **Service area:** ${newState.service_area}\n` +
      `• **Severity:** ${newState.severity}/5\n` +
      `• **Identity:** ${newState.is_anonymous ? 'Anonymous' : 'Show username'}\n\n` +
      STEP_QUESTIONS[ChatStep.COMPLETE]
    : STEP_QUESTIONS[advanced];

  return { reply, state: newState };
}
// ────────────────────────────────────────────────────────────────────────────

const INITIAL_STATE: ChatState = {
  step: ChatStep.SERVICE_AREA,
  completed: false,
};

const INITIAL_GREETING = `Hello! I'm here to help you report a grievance. This process is confidential and your information will be reviewed before being published.

Let's start: What type of service provider are you filing a grievance against? For example: **legal** (attorney/law firm), medical, or contractor.`;

export async function createSession(userId?: string): Promise<ChatSession> {
  const id = uuidv4();
  const initialMessage: ChatMessage = {
    role: 'assistant',
    content: INITIAL_GREETING,
    timestamp: new Date().toISOString(),
  };

  const result = await query(
    `INSERT INTO chat_sessions (id, user_id, messages, state)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [id, userId || null, JSON.stringify([initialMessage]), JSON.stringify(INITIAL_STATE)]
  );
  return result.rows[0] as ChatSession;
}

export async function getSession(sessionId: string): Promise<ChatSession | null> {
  const result = await query(
    `SELECT * FROM chat_sessions WHERE id = $1 AND expires_at > NOW()`,
    [sessionId]
  );
  return result.rows[0] || null;
}

export async function processMessage(
  sessionId: string,
  userMessage: string,
  userId?: string
): Promise<{ reply: string; completed: boolean; session: ChatSession }> {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found or expired');

  const userMsg: ChatMessage = {
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString(),
  };

  const messages = [...session.messages, userMsg];
  const state = session.state as ChatState;

  let reply: string;
  let newState: ChatState;

  try {
    ({ reply, state: newState } = await conductIntake(messages, state));
  } catch (err) {
    logger.warn('LLM unavailable, using rule-based fallback', { error: String(err) });
    ({ reply, state: newState } = ruleBasedProcess(userMessage, state));
  }

  const assistantMsg: ChatMessage = {
    role: 'assistant',
    content: reply,
    timestamp: new Date().toISOString(),
  };

  const updatedMessages = [...messages, assistantMsg];

  await query(
    `UPDATE chat_sessions SET messages = $1, state = $2, updated_at = NOW() WHERE id = $3`,
    [JSON.stringify(updatedMessages), JSON.stringify(newState), sessionId]
  );

  const updated = await getSession(sessionId);
  return {
    reply,
    completed: newState.completed,
    session: updated!,
  };
}

export async function completeSession(
  sessionId: string,
  grievanceId: string
): Promise<void> {
  await query(
    `UPDATE chat_sessions SET grievance_id = $1, updated_at = NOW() WHERE id = $2`,
    [grievanceId, sessionId]
  );
}
