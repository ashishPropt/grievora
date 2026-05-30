import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth';
import { grievanceLimiter } from '../middleware/rateLimiter';
import { UserRole } from '../types';
import { createSession, getSession, processMessage, completeSession } from '../services/session';
import { resolveProvider } from '../services/providerResolver';
import { summarizeGrievance, moderateContent } from '../services/llm';
import { computeProviderScore } from '../services/scoring';
import { uploadFile } from '../services/storage';
import logger from '../utils/logger';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Start a chat session
router.post('/start', optionalAuth, grievanceLimiter, async (req: Request, res: Response) => {
  try {
    const session = await createSession(req.user?.id);
    res.status(201).json({ session_id: session.id, message: session.messages[0].content });
  } catch (err) {
    logger.error('Failed to start session', { error: String(err) });
    res.status(500).json({ error: 'Failed to start grievance session' });
  }
});

// Send message in a chat session
router.post('/session/:session_id/message', optionalAuth, async (req: Request, res: Response) => {
  const { session_id } = req.params;
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

  try {
    const result = await processMessage(session_id, message.trim(), req.user?.id);
    res.json({
      reply: result.reply,
      completed: result.completed,
      session_id,
    });
  } catch (err) {
    const msg = String(err);
    if (msg.includes('not found')) return res.status(404).json({ error: 'Session not found or expired' });
    logger.error('Session message error', { error: msg });
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Complete a session and create a grievance record
router.post('/session/:session_id/complete', optionalAuth, grievanceLimiter, async (req: Request, res: Response) => {
  const { session_id } = req.params;

  const session = await getSession(session_id);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });

  const state = session.state;
  if (!state.completed && !state.description) {
    return res.status(400).json({ error: 'Grievance intake not complete. Continue the conversation.' });
  }

  const rawText = state.description || session.messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join('\n');

  if (rawText.length < 10) return res.status(400).json({ error: 'Description too short' });

  try {
    // Resolve provider
    let providerId: string | null = null;
    if (state.provider_name && state.provider_city && state.provider_state) {
      const resolved = await resolveProvider(
        state.provider_name,
        state.provider_city,
        state.provider_state,
        state.service_area || 'LEGAL'
      );
      providerId = resolved.providerId;
    }

    // Summarize and classify (async but awaited for now)
    const [summary, moderation] = await Promise.all([
      summarizeGrievance(rawText),
      moderateContent(rawText),
    ]);

    const userId = req.user?.id || null;

    const result = await query(
      `INSERT INTO grievances
         (user_id, provider_id, service_area, raw_text, summary, category, severity,
          incident_date, is_anonymous, llm_risk_score, llm_flags, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'PENDING_MODERATION') RETURNING *`,
      [
        userId,
        providerId,
        (state.service_area || 'LEGAL').toUpperCase(),
        rawText,
        summary.summary,
        summary.category,
        state.severity || summary.severity_suggestion || 3,
        state.incident_date || null,
        state.is_anonymous !== false,
        moderation.risk_score,
        JSON.stringify(moderation.flags),
      ]
    );

    const grievance = result.rows[0];
    await completeSession(session_id, grievance.id);

    // Award point if logged in (optimistic; deducted if moderation rejects)
    if (userId) {
      await query(`UPDATE users SET points = points + 1 WHERE id = $1`, [userId]);
    }

    res.status(201).json({ grievance_id: grievance.id, status: grievance.status });
  } catch (err) {
    logger.error('Failed to complete grievance', { error: String(err) });
    res.status(500).json({ error: 'Failed to create grievance' });
  }
});

// Upload evidence file
router.post('/session/:session_id/evidence', optionalAuth, upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  try {
    const key = await uploadFile(req.file.buffer, req.file.mimetype, req.file.originalname);
    res.json({ key, filename: req.file.originalname });
  } catch {
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Get grievance by ID
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  const result = await query(
    `SELECT g.*, p.name as provider_name,
       CASE WHEN g.is_anonymous THEN NULL ELSE u.username END as submitter_username
     FROM grievances g
     LEFT JOIN providers p ON g.provider_id = p.id
     LEFT JOIN users u ON g.user_id = u.id
     WHERE g.id = $1`,
    [req.params.id]
  );

  if (!result.rows[0]) return res.status(404).json({ error: 'Grievance not found' });
  const g = result.rows[0];

  if (g.status !== 'APPROVED' && !req.user) {
    return res.status(403).json({ error: 'Not available' });
  }
  if (g.status !== 'APPROVED' && req.user?.role === UserRole.USER && g.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Not available' });
  }

  // Hide raw text unless moderator or own grievance
  if (req.user?.role === UserRole.USER || !req.user) {
    delete g.raw_text;
  }

  res.json(g);
});

// Current user's grievances
router.get('/me/list', authenticate, async (req: Request, res: Response) => {
  const result = await query(
    `SELECT g.*, p.name as provider_name FROM grievances g
     LEFT JOIN providers p ON g.provider_id = p.id
     WHERE g.user_id = $1 ORDER BY g.created_at DESC LIMIT 50`,
    [req.user!.id]
  );
  res.json(result.rows);
});

export default router;
