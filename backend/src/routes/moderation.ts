import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '../types';
import { computeProviderScore } from '../services/scoring';
import logger from '../utils/logger';

const router = Router();

router.use(authenticate, requireRole(UserRole.MODERATOR, UserRole.ADMIN));

// List grievances pending moderation
router.get('/grievances', async (req: Request, res: Response) => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const result = await query(
    `SELECT g.*, p.name as provider_name,
       CASE WHEN g.is_anonymous THEN NULL ELSE u.username END as submitter_username
     FROM grievances g
     LEFT JOIN providers p ON g.provider_id = p.id
     LEFT JOIN users u ON g.user_id = u.id
     WHERE g.status = 'PENDING_MODERATION'
     ORDER BY g.llm_risk_score DESC NULLS LAST, g.created_at ASC
     LIMIT $1 OFFSET $2`,
    [parseInt(limit), offset]
  );
  res.json(result.rows);
});

// Approve
router.post('/grievances/:id/approve', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const grievance = await transaction(async (client) => {
      const g = await client.query(`SELECT * FROM grievances WHERE id = $1 FOR UPDATE`, [id]);
      if (!g.rows[0]) throw new Error('NOT_FOUND');
      if (g.rows[0].status !== 'PENDING_MODERATION') throw new Error('NOT_PENDING');

      await client.query(`UPDATE grievances SET status = 'APPROVED', updated_at = NOW() WHERE id = $1`, [id]);
      await client.query(
        `INSERT INTO moderation_actions (grievance_id, moderator_id, action, reason)
         VALUES ($1, $2, 'APPROVE', $3)`,
        [id, req.user!.id, reason || null]
      );
      return g.rows[0];
    });

    // Recompute provider score asynchronously
    if (grievance.provider_id) {
      computeProviderScore(grievance.provider_id).catch((err) =>
        logger.error('Score recompute failed', { error: String(err) })
      );
    }

    res.json({ message: 'Grievance approved' });
  } catch (err) {
    const msg = String(err);
    if (msg.includes('NOT_FOUND')) return res.status(404).json({ error: 'Grievance not found' });
    if (msg.includes('NOT_PENDING')) return res.status(409).json({ error: 'Grievance is not pending moderation' });
    logger.error('Approve failed', { error: msg });
    res.status(500).json({ error: 'Failed to approve grievance' });
  }
});

// Reject
router.post('/grievances/:id/reject', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ error: 'Reason is required for rejection' });

  try {
    await transaction(async (client) => {
      const g = await client.query(`SELECT * FROM grievances WHERE id = $1 FOR UPDATE`, [id]);
      if (!g.rows[0]) throw new Error('NOT_FOUND');

      await client.query(`UPDATE grievances SET status = 'REJECTED', updated_at = NOW() WHERE id = $1`, [id]);
      await client.query(
        `INSERT INTO moderation_actions (grievance_id, moderator_id, action, reason)
         VALUES ($1, $2, 'REJECT', $3)`,
        [id, req.user!.id, reason]
      );

      // Deduct point if was awarded
      if (g.rows[0].user_id) {
        await client.query(
          `UPDATE users SET points = GREATEST(0, points - 1) WHERE id = $1`,
          [g.rows[0].user_id]
        );
      }
    });
    res.json({ message: 'Grievance rejected' });
  } catch (err) {
    const msg = String(err);
    if (msg.includes('NOT_FOUND')) return res.status(404).json({ error: 'Grievance not found' });
    res.status(500).json({ error: 'Failed to reject grievance' });
  }
});

// Edit/redact
const editSchema = z.object({
  summary: z.string().optional(),
  raw_text: z.string().optional(),
  reason: z.string().min(1),
});

router.post('/grievances/:id/edit', async (req: Request, res: Response) => {
  const parsed = editSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const { id } = req.params;
  const { summary, raw_text, reason } = parsed.data;

  const g = await query(`SELECT * FROM grievances WHERE id = $1`, [id]);
  if (!g.rows[0]) return res.status(404).json({ error: 'Not found' });

  const changes: Record<string, unknown> = {};
  if (summary) changes.summary = { from: g.rows[0].summary, to: summary };
  if (raw_text) changes.raw_text = { redacted: true };

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  let paramIdx = 1;
  if (summary) { sets.push(`summary = $${paramIdx++}`); params.push(summary); }
  if (raw_text) { sets.push(`raw_text = $${paramIdx++}`); params.push(raw_text); }
  params.push(id);

  await query(`UPDATE grievances SET ${sets.join(', ')} WHERE id = $${paramIdx}`, params);
  await query(
    `INSERT INTO moderation_actions (grievance_id, moderator_id, action, reason, changes)
     VALUES ($1, $2, 'EDIT', $3, $4)`,
    [id, req.user!.id, reason, JSON.stringify(changes)]
  );

  res.json({ message: 'Grievance updated' });
});

// Merge providers
router.post('/providers/merge', requireRole(UserRole.ADMIN), async (req: Request, res: Response) => {
  const { source_provider_id, target_provider_id, reason } = req.body;
  if (!source_provider_id || !target_provider_id) {
    return res.status(400).json({ error: 'source_provider_id and target_provider_id required' });
  }
  if (source_provider_id === target_provider_id) {
    return res.status(400).json({ error: 'Cannot merge a provider with itself' });
  }

  try {
    await transaction(async (client) => {
      // Reassign all grievances from source to target
      await client.query(
        `UPDATE grievances SET provider_id = $1 WHERE provider_id = $2`,
        [target_provider_id, source_provider_id]
      );
      // Log the merge
      await client.query(
        `INSERT INTO provider_merges (source_provider_id, target_provider_id, moderator_id, reason)
         VALUES ($1, $2, $3, $4)`,
        [source_provider_id, target_provider_id, req.user!.id, reason || null]
      );
      // Delete source
      await client.query(`DELETE FROM providers WHERE id = $1`, [source_provider_id]);
    });

    await computeProviderScore(target_provider_id);
    res.json({ message: 'Providers merged' });
  } catch (err) {
    logger.error('Provider merge failed', { error: String(err) });
    res.status(500).json({ error: 'Merge failed' });
  }
});

// Mark provider verified
router.post('/providers/:id/verify', async (req: Request, res: Response) => {
  await query(`UPDATE providers SET status = 'VERIFIED', updated_at = NOW() WHERE id = $1`, [req.params.id]);
  res.json({ message: 'Provider verified' });
});

export default router;
