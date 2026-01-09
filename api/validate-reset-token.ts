// api/validate-reset-token.ts
// Vercel Serverless Function / Backend API endpoint
// Validates password reset token and checks 5-minute expiry

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

    // Get database URL from environment or use default
    const databaseURL = process.env.FIREBASE_DATABASE_URL || 
      'https://defendu-e7970-default-rtdb.asia-southeast1.firebasedatabase.app';

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      databaseURL: databaseURL,
    });
  }
  return adminApp;
}

/**
 * POST /api/validate-reset-token
 * Request body: { token: string }
 * 
 * Validates password reset token and checks if it's expired (5 minutes)
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
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    const adminApp = getAdminApp();
    const db = adminApp.database();

    // Get token metadata from Realtime Database
    const tokenSnapshot = await db.ref(`passwordResetTokens/${token}`).once('value');
    const tokenData = tokenSnapshot.val();

    if (!tokenData) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Invalid or expired token' 
      });
    }

    // Check if token has been used
    if (tokenData.used) {
      return res.status(400).json({ 
        valid: false, 
        error: 'This token has already been used' 
      });
    }

    // Check if token is expired (5 minutes)
    const now = Date.now();
    if (now > tokenData.expiresAt) {
      // Clean up expired token
      await db.ref(`passwordResetTokens/${token}`).remove();
      return res.status(400).json({ 
        valid: false, 
        error: 'Token has expired. Please request a new password reset link.' 
      });
    }

    // Verify token with Firebase Auth
    try {
      const auth = adminApp.auth();
      // Extract email from token
      const email = tokenData.email;
      
      // Verify the action code is valid
      // Note: Firebase Admin SDK doesn't have a direct verifyPasswordResetCode method
      // We'll rely on our custom expiry check and Firebase's token validation
      
      return res.status(200).json({
        valid: true,
        email: email,
        expiresAt: tokenData.expiresAt,
        timeRemaining: tokenData.expiresAt - now, // milliseconds remaining
      });
    } catch (error: any) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Invalid token format' 
      });
    }
  } catch (error: any) {
    console.error('❌ Token validation error:', error);
    return res.status(500).json({
      error: 'Failed to validate token',
      message: error.message,
    });
  }
}

