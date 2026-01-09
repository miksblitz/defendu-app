// api/confirm-password-reset.ts
// Vercel Serverless Function / Backend API endpoint
// Confirms password reset after token validation

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
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

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
  }
  return adminApp;
}

/**
 * POST /api/confirm-password-reset
 * Request body: { token: string, newPassword: string }
 * 
 * Confirms password reset after token validation
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight (OPTIONS request)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set CORS headers for POST requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { token, newPassword } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'New password is required' });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const adminApp = getAdminApp();
    const db = adminApp.database();
    const auth = adminApp.auth();

    // Get token metadata
    const tokenSnapshot = await db.ref(`passwordResetTokens/${token}`).once('value');
    const tokenData = tokenSnapshot.val();

    if (!tokenData) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Check expiry (5 minutes)
    if (Date.now() > tokenData.expiresAt) {
      await db.ref(`passwordResetTokens/${token}`).remove();
      return res.status(400).json({ error: 'Token has expired. Please request a new password reset link.' });
    }

    // Check if already used
    if (tokenData.used) {
      return res.status(400).json({ error: 'Token has already been used' });
    }

    // Update password using Firebase Admin SDK
    const userRecord = await auth.getUserByEmail(tokenData.email);
    await auth.updateUser(userRecord.uid, {
      password: newPassword,
    });

    // Mark token as used
    await db.ref(`passwordResetTokens/${token}`).update({ used: true });

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error: any) {
    console.error('❌ Password reset confirmation error:', error);
    return res.status(500).json({
      error: 'Failed to reset password',
      message: error.message,
    });
  }
}
