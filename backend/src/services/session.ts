import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import { ChatMessage, ChatSession, ChatState, ChatStep } from '../types';
import { conductIntake } from './llm';
import logger from '../utils/logger';

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

  const { reply, state: newState } = await conductIntake(messages, state);

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
