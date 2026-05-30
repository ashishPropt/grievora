import { query } from '../db';
import logger from '../utils/logger';

const W1 = 0.4; // grievance count weight
const W2 = 0.4; // avg severity weight
const W3 = 0.2; // recency weight

export async function computeProviderScore(providerId: string): Promise<void> {
  const grievances = await query(
    `SELECT severity, created_at FROM grievances
     WHERE provider_id = $1 AND status = 'APPROVED'`,
    [providerId]
  );

  const rows = grievances.rows;
  if (rows.length === 0) {
    await query(
      `INSERT INTO provider_scores (provider_id, grievance_count, avg_severity, recency_factor, score)
       VALUES ($1, 0, 0, 0, 0)
       ON CONFLICT (provider_id) DO UPDATE SET
         grievance_count = 0, avg_severity = 0, recency_factor = 0, score = 0, last_computed_at = NOW()`,
      [providerId]
    );
    return;
  }

  const grievanceCount = rows.length;
  const avgSeverity = rows.reduce((sum: number, r: { severity: number }) => sum + r.severity, 0) / grievanceCount;

  const now = Date.now();
  const recencyFactor = rows.reduce((sum: number, r: { created_at: Date }) => {
    const daysSince = (now - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
    return sum + 1 / (daysSince + 1);
  }, 0);

  const score = W1 * grievanceCount + W2 * avgSeverity + W3 * recencyFactor;

  await query(
    `INSERT INTO provider_scores (provider_id, grievance_count, avg_severity, recency_factor, score)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (provider_id) DO UPDATE SET
       grievance_count = $2, avg_severity = $3, recency_factor = $4, score = $5, last_computed_at = NOW()`,
    [providerId, grievanceCount, avgSeverity.toFixed(2), recencyFactor.toFixed(4), score.toFixed(4)]
  );

  logger.info('Provider score computed', { providerId, score: score.toFixed(2), grievanceCount });
}

export async function recomputeAllScores(): Promise<void> {
  const providers = await query(`SELECT DISTINCT provider_id FROM grievances WHERE status = 'APPROVED'`);
  for (const row of providers.rows) {
    await computeProviderScore(row.provider_id);
  }
}
