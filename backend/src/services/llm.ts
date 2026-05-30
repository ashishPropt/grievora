import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import logger from '../utils/logger';
import { ChatMessage, ChatState, ChatStep } from '../types';

const client = new Anthropic({ apiKey: config.anthropic.apiKey });

const SYSTEM_INTAKE = `You are a compassionate grievance intake specialist for Grievora, a platform that helps people report issues with service providers. Your job is to gather information about a grievance through a natural conversation.

You must collect these fields in order:
1. SERVICE_AREA: What type of service (legal, medical, contractor). MVP supports "legal" only.
2. PROVIDER_NAME: The name of the law firm, attorney, or legal service provider.
3. PROVIDER_LOCATION: City and state where the provider operates.
4. DESCRIPTION: What happened — the details of the grievance. Encourage specifics.
5. INCIDENT_DATE: Approximately when this happened.
6. SEVERITY: A rating from 1 (minor inconvenience) to 5 (severe harm).
7. EVIDENCE: Any links, documents, or evidence they want to share (optional).
8. IDENTITY: Whether they want their username shown or prefer to remain anonymous.

Keep questions short and empathetic. Never ask multiple questions at once. Validate responses and ask for clarification if a response is too vague or doesn't answer the question. Once all fields are collected, confirm the grievance details with the user.

Respond with JSON in this exact format:
{
  "reply": "Your message to the user",
  "extracted": {
    "service_area": null or string,
    "provider_name": null or string,
    "provider_city": null or string,
    "provider_state": null or string,
    "description": null or string,
    "incident_date": null or string (YYYY-MM-DD or approximate like "March 2024"),
    "severity": null or number 1-5,
    "evidence_urls": null or array of strings,
    "is_anonymous": null or boolean
  },
  "next_step": "SERVICE_AREA|PROVIDER_NAME|PROVIDER_LOCATION|WHAT_HAPPENED|WHEN_HAPPENED|SEVERITY|EVIDENCE|IDENTITY|COMPLETE"
}`;

export async function conductIntake(
  messages: ChatMessage[],
  state: ChatState
): Promise<{ reply: string; state: ChatState }> {
  const anthropicMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const stateContext = `Current state: step=${state.step}, collected so far: ${JSON.stringify({
    service_area: state.service_area,
    provider_name: state.provider_name,
    provider_city: state.provider_city,
    provider_state: state.provider_state,
    description: state.description,
    incident_date: state.incident_date,
    severity: state.severity,
    evidence_urls: state.evidence_urls,
    is_anonymous: state.is_anonymous,
  })}`;

  const response = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 1024,
    system: SYSTEM_INTAKE + '\n\n' + stateContext,
    messages: anthropicMessages,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);

    const newState: ChatState = { ...state };
    const ext = parsed.extracted || {};
    if (ext.service_area) newState.service_area = ext.service_area.toUpperCase();
    if (ext.provider_name) newState.provider_name = ext.provider_name;
    if (ext.provider_city) newState.provider_city = ext.provider_city;
    if (ext.provider_state) newState.provider_state = ext.provider_state;
    if (ext.description) newState.description = ext.description;
    if (ext.incident_date) newState.incident_date = ext.incident_date;
    if (ext.severity) newState.severity = parseInt(String(ext.severity));
    if (ext.evidence_urls) newState.evidence_urls = ext.evidence_urls;
    if (ext.is_anonymous !== null && ext.is_anonymous !== undefined) newState.is_anonymous = ext.is_anonymous;

    if (parsed.next_step === ChatStep.COMPLETE) {
      newState.step = ChatStep.COMPLETE;
      newState.completed = true;
    } else if (parsed.next_step) {
      newState.step = parsed.next_step as ChatStep;
    }

    return { reply: parsed.reply, state: newState };
  } catch (err) {
    logger.warn('Failed to parse LLM intake response, using raw text', { error: String(err) });
    return { reply: text, state };
  }
}

export async function summarizeGrievance(rawText: string): Promise<{
  summary: string;
  category: string;
  severity_suggestion: number;
}> {
  const fallback = { summary: rawText.slice(0, 300), category: 'OTHER', severity_suggestion: 3 };
  try {
    const response = await client.messages.create({
      model: config.anthropic.model,
      max_tokens: 512,
      system: `Summarize a user grievance into a short neutral description (2-3 sentences). Also classify it and suggest a severity. Return JSON only:
{"summary":"...","category":"BILLING|MISCONDUCT|DELAY|COMMUNICATION|OTHER","severity_suggestion":1-5}`,
      messages: [{ role: 'user', content: rawText }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : fallback;
  } catch (err) {
    logger.warn('summarizeGrievance LLM call failed, using fallback', { error: String(err) });
    return fallback;
  }
}

export async function moderateContent(rawText: string): Promise<{
  is_allowed: boolean;
  risk_score: number;
  flags: string[];
}> {
  if (!config.anthropic.apiKey) return { is_allowed: true, risk_score: 0, flags: [] };

  try {
    const response = await client.messages.create({
      model: config.anthropic.model,
      max_tokens: 256,
      system: `Evaluate this user-submitted grievance text for content policy violations. Check for: hate speech, threats, doxxing, spam, false factual claims presented as definitive fact, explicit content. This is a grievance platform so strong opinions and frustration are allowed. Return JSON only:
{"is_allowed":true/false,"risk_score":0.0-1.0,"flags":["FLAG1","FLAG2"]}`,
      messages: [{ role: 'user', content: rawText }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { is_allowed: true, risk_score: 0, flags: [] };
  } catch (err) {
    logger.error('LLM moderation failed', { error: String(err) });
    return { is_allowed: true, risk_score: 0.5, flags: ['MODERATION_FAILED'] };
  }
}
