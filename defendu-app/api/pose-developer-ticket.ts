// POST /api/pose-developer-ticket — Mailjet pose-estimation work ticket (no password-reset / email field).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getJsonBody } from '../lib/getVercelJsonBody';
import { respondPoseDeveloperTicket } from '../lib/mailjetPoseTicket';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    const body = getJsonBody(req);
    console.log('🎫 pose-developer-ticket keys:', Object.keys(body).join(', '));
    await respondPoseDeveloperTicket(res, body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('pose-developer-ticket handler error:', message);
    if (!res.writableEnded) {
      res.status(500).json({ error: 'Failed to submit ticket', message });
    }
  }
}
