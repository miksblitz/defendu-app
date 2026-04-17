// api/verify-password-reset-otp.ts
// Verifies 6-digit code from password reset email; returns reset token for /resetpassword.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { bodyStr, getJsonBody } from '../lib/getVercelJsonBody';

let adminApp: admin.app.App | null = null;

function getAdminApp(): admin.app.App {
  if (!adminApp) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;

    if (!serviceAccountKey) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 environment variable is not set');
    }

    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountKey, 'base64').toString('utf8')
    );

    const databaseURL =
      process.env.FIREBASE_DATABASE_URL ||
      'https://defendu-e7970-default-rtdb.asia-southeast1.firebasedatabase.app';

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      databaseURL: databaseURL,
    });
  }
  return adminApp;
}

/**
 * POST /api/verify-password-reset-otp
 * Body: { email: string, code: string } — code is 6 digits
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const body = getJsonBody(req);
    const email = bodyStr(body.email).toLowerCase().trim();
    const code = bodyStr(body.code).replace(/\D/g, '');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    if (code.length !== 6) {
      return res.status(400).json({ error: 'Please enter the 6-digit code' });
    }

    const emailKey = email.replace(/\./g, ',');
    const db = getAdminApp().database();

    const idxSnap = await db.ref(`passwordResetEmailIndex/${emailKey}`).once('value');
    const idx = idxSnap.val() as { token?: string } | null;
    if (!idx || typeof idx.token !== 'string') {
      return res.status(400).json({
        error: 'No reset request found. Go back and request a new code.',
      });
    }

    const token = idx.token;
    const tokenSnap = await db.ref(`passwordResetTokens/${token}`).once('value');
    const tokenData = tokenSnap.val() as {
      email?: string;
      otp?: string;
      expiresAt?: number;
      used?: boolean;
    } | null;

    if (!tokenData) {
      await db.ref(`passwordResetEmailIndex/${emailKey}`).remove();
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    if (tokenData.used) {
      return res.status(400).json({
        error: 'This code was already used. Request a new password reset.',
      });
    }

    const now = Date.now();
    if (!tokenData.expiresAt || now > tokenData.expiresAt) {
      await db.ref(`passwordResetTokens/${token}`).remove();
      await db.ref(`passwordResetEmailIndex/${emailKey}`).remove();
      return res.status(400).json({ error: 'Code expired. Please request a new one.' });
    }

    const tokenEmail = String(tokenData.email || '').toLowerCase().trim();
    if (tokenEmail !== email) {
      return res.status(400).json({ error: 'Invalid code for this email.' });
    }

    if (String(tokenData.otp || '') !== code) {
      return res.status(400).json({ error: 'Invalid code. Please try again.' });
    }

    return res.status(200).json({
      success: true,
      token,
      expiresAt: tokenData.expiresAt,
    });
  } catch (error: any) {
    console.error('verify-password-reset-otp error:', error);
    return res.status(500).json({
      error: 'Failed to verify code',
      message: error.message,
    });
  }
}
