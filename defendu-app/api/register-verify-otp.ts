// api/register-verify-otp.ts
// Vercel Serverless Function
// Verifies a 6-digit OTP previously stored by register-send-otp.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { getJsonBody } from '../lib/getVercelJsonBody';

let adminApp: admin.app.App | null = null;

function getAdminApp(): admin.app.App {
  if (!adminApp) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
    if (!serviceAccountKey) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 not set');
    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountKey, 'base64').toString('utf8')
    );
    const databaseURL =
      process.env.FIREBASE_DATABASE_URL ||
      'https://defendu-e7970-default-rtdb.asia-southeast1.firebasedatabase.app';
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      databaseURL,
    });
  }
  return adminApp;
}

/**
 * POST /api/register-verify-otp
 * Body: { email: string, code: string }
 *
 * Validates the OTP. On success, removes it so it cannot be reused.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = getJsonBody(req);
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const code =
    typeof body.code === 'string' ? body.code.trim() : '';

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required.' });
  }

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Code must be a 6-digit number.' });
  }

  try {
    getAdminApp();
    const db = admin.database();
    const safeEmail = email.replace(/\./g, ',');
    const snap = await db.ref(`registrationOtps/${safeEmail}`).once('value');

    if (!snap.exists()) {
      return res
        .status(400)
        .json({ error: 'No verification code found. Please request a new one.' });
    }

    const { otp, expiresAt } = snap.val() as { otp: string; expiresAt: number; createdAt: number };

    if (Date.now() > expiresAt) {
      await db.ref(`registrationOtps/${safeEmail}`).remove();
      return res
        .status(400)
        .json({ error: 'Verification code has expired. Please request a new one.' });
    }

    if (otp !== code) {
      return res.status(400).json({ error: 'Invalid verification code. Please try again.' });
    }

    // Valid — delete so it cannot be reused
    await db.ref(`registrationOtps/${safeEmail}`).remove();

    return res.status(200).json({ valid: true });
  } catch (error: any) {
    console.error('register-verify-otp error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
