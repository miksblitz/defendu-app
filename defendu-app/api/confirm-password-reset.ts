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

    // Get user record
    const userRecord = await auth.getUserByEmail(tokenData.email);
    
    // IMPORTANT: Check if new password is the same as the old password
    // We use Firebase Auth REST API to attempt sign-in with the new password
    // If sign-in succeeds, it means the password hasn't changed
    const firebaseApiKey = process.env.FIREBASE_API_KEY;
    
    if (!firebaseApiKey) {
      console.error('❌ FIREBASE_API_KEY not set - cannot verify password difference');
      console.error('⚠️ WARNING: Password reset will proceed without checking if password is different');
      // Continue without the check, but this is a security concern
      // In production, FIREBASE_API_KEY should always be set
    } else {
      try {
        // Use Firebase Auth REST API to verify if password matches current password
        const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`;
        const verifyResponse = await fetch(verifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: tokenData.email,
            password: newPassword,
            returnSecureToken: true,
          }),
        });

        const verifyResult = await verifyResponse.json();
        
        // If sign-in succeeds (status 200 and we get an idToken), 
        // the new password is the same as the current password - BLOCK IT
        if (verifyResponse.ok && verifyResult.idToken) {
          console.log('❌ Password reset BLOCKED: New password is identical to current password');
          return res.status(400).json({ 
            error: 'New password must be different from your current password. Please choose a different password.' 
          });
        }
        
        // If sign-in fails, check the error type
        if (verifyResult.error) {
          const errorMessage = verifyResult.error?.message || '';
          const errorCode = verifyResult.error?.code || '';
          
          // If error is "INVALID_PASSWORD" or "wrong-password", that's GOOD - password is different
          if (errorCode === 400 && (
            errorMessage.includes('INVALID_PASSWORD') || 
            errorMessage.includes('wrong-password') ||
            errorMessage.includes('INVALID_LOGIN_CREDENTIALS')
          )) {
            // Password is different from current - this is what we want, proceed with reset
            console.log('✅ Password validation passed: New password is different from current password');
          } else {
            // Other errors (user-not-found, network issues, etc.) - log but don't block
            // These shouldn't prevent password reset
            console.log('⚠️ Password check returned unexpected error:', errorMessage);
            console.log('⚠️ Proceeding with password reset despite check error');
          }
        }
      } catch (checkError: any) {
        // Network errors or other exceptions - log but don't block
        // We don't want to prevent password reset due to temporary network issues
        console.error('⚠️ Password check exception:', checkError.message);
        console.error('⚠️ Proceeding with password reset - check failed but not blocking');
      }
    }

    // Update password using Firebase Admin SDK
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
