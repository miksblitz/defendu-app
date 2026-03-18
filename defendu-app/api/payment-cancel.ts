// api/payment-cancel.ts
// Vercel Serverless Function - PayMongo payment cancellation redirect

import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * GET /api/payment-cancel
 * Called when user cancels payment on PayMongo checkout.
 * Redirects back to the app.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return res.redirect(302, 'defenduapp://wallet?status=cancelled');
}
