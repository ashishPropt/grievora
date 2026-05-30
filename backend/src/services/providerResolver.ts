import axios from 'axios';
import Fuse from 'fuse.js';
import { query } from '../db';
import { config } from '../config';
import { Provider } from '../types';
import logger from '../utils/logger';

interface SearchResult {
  title: string;
  snippet: string;
  link: string;
}

async function searchWeb(providerName: string, city: string, state: string): Promise<SearchResult[]> {
  if (!config.serper.apiKey) return [];
  try {
    const res = await axios.post(
      'https://google.serper.dev/search',
      { q: `"${providerName}" lawyer attorney "${city}" "${state}"`, num: 5 },
      { headers: { 'X-API-KEY': config.serper.apiKey, 'Content-Type': 'application/json' }, timeout: 5000 }
    );
    return res.data.organic || [];
  } catch (err) {
    logger.warn('Web search failed', { error: String(err) });
    return [];
  }
}

export async function resolveProvider(
  name: string,
  city: string,
  state: string,
  serviceArea: string
): Promise<{ providerId: string; isNew: boolean }> {
  // Find existing providers in same area
  const existing = await query(
    `SELECT * FROM providers WHERE LOWER(service_area) = LOWER($1) AND LOWER(city) = LOWER($2) AND LOWER(state) = LOWER($3)`,
    [serviceArea, city, state]
  );

  if (existing.rows.length > 0) {
    const fuse = new Fuse<Provider>(existing.rows, {
      keys: ['name'],
      threshold: 0.4,
      includeScore: true,
    });

    const results = fuse.search(name);
    if (results.length > 0 && results[0].score! < 0.4) {
      logger.info('Matched existing provider', { name, matched: results[0].item.name });
      return { providerId: results[0].item.id, isNew: false };
    }
  }

  // Try web search to enrich the provider record
  const searchResults = await searchWeb(name, city, state);
  const website = searchResults[0]?.link || null;

  const result = await query(
    `INSERT INTO providers (name, service_area, city, state, website, status)
     VALUES ($1, $2, $3, $4, $5, 'UNVERIFIED') RETURNING id`,
    [name, serviceArea.toUpperCase(), city, state, website]
  );

  // Create initial score record
  await query(
    `INSERT INTO provider_scores (provider_id) VALUES ($1) ON CONFLICT (provider_id) DO NOTHING`,
    [result.rows[0].id]
  );

  return { providerId: result.rows[0].id, isNew: true };
}
