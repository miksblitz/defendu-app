// api/register-send-otp.ts
// Vercel Serverless Function
// Generates a 6-digit OTP, stores it in Firebase, and sends it via Mailjet.

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
 * POST /api/register-send-otp
 * Body: { email: string }
 *
 * Checks that the email is not already registered, generates a 6-digit OTP
 * valid for 10 minutes, persists it in Firebase, and emails it via Mailjet.
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  try {
    const app = getAdminApp();
    const authAdmin = app.auth();

    // Block if email already in use
    try {
      await authAdmin.getUserByEmail(email);
      return res
        .status(409)
        .json({ error: 'An account already exists with this email address.' });
    } catch (e: any) {
      if (e.code !== 'auth/user-not-found') throw e;
      // Good — email is available
    }

    // Enforce a 60-second cooldown: reject if a valid (non-expired) OTP was sent recently
    const safeEmail = email.replace(/\./g, ',');
    const db = admin.database();
    const existing = await db.ref(`registrationOtps/${safeEmail}`).once('value');
    if (existing.exists()) {
      const { createdAt } = existing.val() as { createdAt: number; otp: string; expiresAt: number };
      if (Date.now() - createdAt < 60_000) {
        return res.status(429).json({ error: 'Please wait before requesting another code.' });
      }
    }

    // Generate cryptographically adequate 6-digit OTP
    const crypto = require('crypto');
    const otp = (parseInt(crypto.randomBytes(3).toString('hex'), 16) % 900000 + 100000).toString();
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    await db.ref(`registrationOtps/${safeEmail}`).set({ otp, expiresAt, createdAt: now });

    // Send email via Mailjet
    const mailjetApiKey = process.env.MAILJET_API_KEY;
    const mailjetApiSecret = process.env.MAILJET_API_SECRET;
    const fromEmail = process.env.MAILJET_FROM_EMAIL || 'noreply@defendu.com';
    const fromName = process.env.MAILJET_FROM_NAME || 'Defendu';

    if (!mailjetApiKey || !mailjetApiSecret) {
      console.error('Mailjet credentials missing');
      return res.status(500).json({ error: 'Email service is not configured.' });
    }

    const emailPayload = {
      Messages: [
        {
          From: { Email: fromEmail, Name: fromName },
          To: [{ Email: email }],
          Subject: `Your Defendu verification code: ${otp}`,
          TextPart: `Your Defendu registration code is: ${otp}\n\nThis code expires in 10 minutes. If you did not request this, please ignore this email.`,
          HTMLPart: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#041527;color:#fff;padding:32px;border-radius:12px;">
              <h2 style="color:#09AEC3;margin-bottom:8px;">Verify your email</h2>
              <p style="color:#ccc;margin-bottom:24px;">Enter this code in the Defendu app to complete your registration.</p>
              <div style="background:#07263d;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
                <span style="font-size:40px;font-weight:700;letter-spacing:14px;color:#fff;">${otp}</span>
              </div>
              <p style="color:#888;font-size:12px;">This code expires in <strong>10 minutes</strong>. If you did not create a Defendu account, please ignore this email.</p>
            </div>
          `,
        },
      ],
    };

    const mjRes = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${mailjetApiKey}:${mailjetApiSecret}`).toString('base64')}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!mjRes.ok) {
      const mjErr = await mjRes.json();
      console.error('Mailjet error:', mjErr);
      return res
        .status(500)
        .json({ error: 'Failed to send verification email. Please try again.' });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('register-send-otp error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
