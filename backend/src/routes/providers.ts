import { Router, Request, Response } from 'express';
import { query } from '../db';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// List providers with search and sort
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  const { q, city, state, service_area, sort = 'score', page = '1', limit = '20' } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (q) {
    conditions.push(`p.name ILIKE $${paramIdx++}`);
    params.push(`%${q}%`);
  }
  if (city) {
    conditions.push(`LOWER(p.city) = LOWER($${paramIdx++})`);
    params.push(city);
  }
  if (state) {
    conditions.push(`LOWER(p.state) = LOWER($${paramIdx++})`);
    params.push(state);
  }
  if (service_area) {
    conditions.push(`LOWER(p.service_area) = LOWER($${paramIdx++})`);
    params.push(service_area);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sortClause = {
    score: 'ps.score DESC',
    grievances: 'ps.grievance_count DESC',
    severity: 'ps.avg_severity DESC',
    name: 'p.name ASC',
  }[sort] || 'ps.score DESC';

  const offset = (parseInt(page) - 1) * parseInt(limit);
  params.push(parseInt(limit), offset);

  const result = await query(
    `SELECT p.*, ps.score, ps.grievance_count, ps.avg_severity
     FROM providers p
     LEFT JOIN provider_scores ps ON p.id = ps.provider_id
     ${where}
     ORDER BY ${sortClause} NULLS LAST
     LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    params
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM providers p ${where}`,
    params.slice(0, -2)
  );

  res.json({
    providers: result.rows,
    total: parseInt(countResult.rows[0].count),
    page: parseInt(page),
    limit: parseInt(limit),
  });
});

// Get provider by ID
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  const result = await query(
    `SELECT p.*, ps.score, ps.grievance_count, ps.avg_severity, ps.recency_factor, ps.last_computed_at
     FROM providers p
     LEFT JOIN provider_scores ps ON p.id = ps.provider_id
     WHERE p.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Provider not found' });
  res.json(result.rows[0]);
});

// List grievances for a provider
router.get('/:id/grievances', optionalAuth, async (req: Request, res: Response) => {
  const { category, severity, sort = 'newest', page = '1', limit = '20' } = req.query as Record<string, string>;

  const conditions = [`g.provider_id = $1`, `g.status = 'APPROVED'`];
  const params: unknown[] = [req.params.id];
  let paramIdx = 2;

  if (category) {
    conditions.push(`g.category = $${paramIdx++}`);
    params.push(category.toUpperCase());
  }
  if (severity) {
    conditions.push(`g.severity = $${paramIdx++}`);
    params.push(parseInt(severity));
  }

  const sortClause = sort === 'severity' ? 'g.severity DESC, g.created_at DESC' : 'g.created_at DESC';
  const offset = (parseInt(page) - 1) * parseInt(limit);
  params.push(parseInt(limit), offset);

  const result = await query(
    `SELECT g.id, g.summary, g.category, g.severity, g.incident_date, g.created_at,
       CASE WHEN g.is_anonymous THEN NULL ELSE u.username END as submitter_username
     FROM grievances g
     LEFT JOIN users u ON g.user_id = u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY ${sortClause}
     LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    params
  );

  res.json(result.rows);
});

export default router;
