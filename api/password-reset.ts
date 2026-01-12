// api/password-reset.ts
// Vercel Serverless Function / Backend API endpoint
// Handles password reset token generation and email sending via Mailjet

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
 * POST /api/password-reset
 * Request body: { email: string }
 * 
 * Generates a password reset token with 5-minute expiry and sends email via Mailjet
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight (OPTIONS request)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set CORS headers for POST requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    console.log('🔵 Password reset request received');
    console.log('🔵 Request method:', req.method);
    console.log('🔵 Request body:', JSON.stringify(req.body, null, 2));
    
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      console.error('❌ Invalid email in request');
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Validate email format FIRST
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // CRITICAL: Check user existence BEFORE any other processing
    // This MUST be the first check after email validation
    console.log('🔵 STEP 1: Checking if user exists for email:', email);
    
    const adminApp = getAdminApp();
    const auth = adminApp.auth();

    // STEP 2: Attempt to get user - if this fails, STOP IMMEDIATELY
    let userRecord: admin.auth.UserRecord | null = null;
    
    try {
      console.log('🔵 STEP 2: Attempting to get user by email:', email);
      userRecord = await auth.getUserByEmail(email);
      console.log('🔵 getUserByEmail returned - validating result...');
      
      // Validate the user record is actually valid
      if (!userRecord) {
        console.error('❌ BLOCKING: getUserByEmail returned null');
        return res.status(404).json({ 
          error: 'No account found with this email address. Please check your email or create an account.',
          code: 'USER_NOT_FOUND'
        });
      }
      
      if (!userRecord.uid || typeof userRecord.uid !== 'string' || userRecord.uid.length === 0) {
        console.error('❌ BLOCKING: getUserByEmail returned invalid UID');
        console.error('❌ userRecord.uid:', userRecord.uid);
        return res.status(404).json({ 
          error: 'No account found with this email address. Please check your email or create an account.',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // User exists and is valid
      console.log('✅ User found and validated - UID:', userRecord.uid);
      
    } catch (error: any) {
      // ANY error means user doesn't exist - BLOCK IMMEDIATELY
      console.log('❌ BLOCKING: Exception caught when checking user');
      console.log('❌ Email:', email);
      console.log('❌ Error type:', typeof error);
      console.log('❌ Error code:', error?.code);
      console.log('❌ Error message:', error?.message);
      console.log('❌ Error name:', error?.name);
      
      // Log full error for debugging
      try {
        console.log('❌ Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      } catch (e) {
        console.log('❌ Could not stringify error');
      }
      
      // ANY exception from getUserByEmail means user doesn't exist
      // Return 404 immediately - do NOT proceed with any processing
      console.log('❌ RETURNING 404 - User does not exist, stopping all processing');
      return res.status(404).json({ 
        error: 'No account found with this email address. Please check your email or create an account.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // FINAL VALIDATION: Ensure userRecord is still valid before proceeding
    if (!userRecord || !userRecord.uid) {
      console.error('❌ CRITICAL: Final validation failed - userRecord invalid');
      return res.status(404).json({ 
        error: 'No account found with this email address. Please check your email or create an account.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    console.log('✅ STEP 3: User validation complete - proceeding with password reset process');
    console.log('✅ Confirmed user UID:', userRecord.uid);

    // Generate custom secure token (NOT using Firebase OOB codes)
    // Create a cryptographically secure random token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex'); // 64 character hex string
    
    // Store token with expiry timestamp (5 minutes from now)
    const tokenExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // FINAL CHECK: Ensure userRecord is valid before using it
    if (!userRecord || !userRecord.uid) {
      console.error('❌ CRITICAL: userRecord invalid before token storage - ABORTING');
      return res.status(404).json({ 
        error: 'No account found with this email address. Please check your email or create an account.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Store token metadata in Realtime Database for validation
    const db = adminApp.database();
    await db.ref(`passwordResetTokens/${token}`).set({
      email,
      userId: userRecord.uid,
      createdAt: Date.now(),
      expiresAt: tokenExpiry,
      used: false,
    });

    console.log('🔵 Custom token generated:', token.substring(0, 8) + '...');
    console.log('🔵 Token expires at:', new Date(tokenExpiry).toISOString());

    // Create a web redirect URL that opens the app via deep link
    // Email clients don't support custom schemes (defenduapp://), so we use a web redirect
    const apiBaseUrl = process.env.API_BASE_URL || 'https://defendu-app.vercel.app';
    const redirectUrl = `${apiBaseUrl}/api/reset-redirect?token=${token}&expiresAt=${tokenExpiry}`;
    
    // Also create direct deep link for manual use
    const deepLinkUrl = `defenduapp://resetpassword?token=${token}&expiresAt=${tokenExpiry}`;
    
    console.log('🔵 Redirect URL (for email):', redirectUrl);
    console.log('🔵 Deep link (manual):', deepLinkUrl);

    // Get Mailjet credentials from environment
    const mailjetApiKey = process.env.MAILJET_API_KEY;
    const mailjetApiSecret = process.env.MAILJET_API_SECRET;
    const mailjetFromEmail = process.env.MAILJET_FROM_EMAIL || 'noreply@defendu.com';
    const mailjetFromName = process.env.MAILJET_FROM_NAME || 'Defendu';

    console.log('🔵 Mailjet API Key exists:', !!mailjetApiKey);
    console.log('🔵 Mailjet API Secret exists:', !!mailjetApiSecret);
    console.log('🔵 From Email:', mailjetFromEmail);
    console.log('🔵 To Email:', email);

    if (!mailjetApiKey || !mailjetApiSecret) {
      console.error('❌ Mailjet credentials missing!');
      console.error('❌ MAILJET_API_KEY:', mailjetApiKey ? 'Set' : 'NOT SET');
      console.error('❌ MAILJET_API_SECRET:', mailjetApiSecret ? 'Set' : 'NOT SET');
      throw new Error('Mailjet credentials not configured. Please set MAILJET_API_KEY and MAILJET_API_SECRET in Vercel environment variables.');
    }

    // FINAL SAFETY CHECK: Ensure we have a valid user before sending email
    if (!userRecord || !userRecord.uid) {
      console.error('❌ CRITICAL SAFETY CHECK FAILED: userRecord is invalid before sending email');
      return res.status(404).json({ 
        error: 'No account found with this email address. Please check your email or create an account.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Send email via Mailjet
    const mailjetApiUrl = 'https://api.mailjet.com/v3.1/send';
    console.log('🔵 Sending email via Mailjet to:', email);
    console.log('🔵 Confirmed user UID:', userRecord.uid);
    const emailData = {
      Messages: [
        {
          From: {
            Email: mailjetFromEmail,
            Name: mailjetFromName,
          },
          To: [
            {
              Email: email,
            },
          ],
          Subject: 'Reset Your Password - Defendu',
          TextPart: `You requested a password reset. Click the link below to reset your password. This link will expire in 5 minutes.\n\n${redirectUrl}\n\nIf you didn't request this, please ignore this email.`,
          HTMLPart: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #041527; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: #00AABB; margin: 0;">Defendu</h1>
                </div>
                <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <h2 style="color: #041527;">Password Reset Request</h2>
                  <p>You requested to reset your password. Click the button below to create a new password. This link will expire in <strong>5 minutes</strong>.</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${redirectUrl}" 
                       style="background-color: #00AABB; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
                      Reset Password
                    </a>
                  </div>
                  <p style="font-size: 12px; color: #666; margin-top: 20px;">Or copy and paste this link into your browser:</p>
                  <p style="font-size: 12px; color: #00AABB; word-break: break-all;">
                    <a href="${redirectUrl}" style="color: #00AABB;">${redirectUrl}</a>
                  </p>
                  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                  <p style="font-size: 12px; color: #666;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                </div>
              </body>
            </html>
          `,
        },
      ],
    };

    const authHeader = Buffer.from(`${mailjetApiKey}:${mailjetApiSecret}`).toString('base64');
    
    console.log('🔵 Calling Mailjet API...');
    const mailjetResponse = await fetch(mailjetApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify(emailData),
    });

    console.log('🔵 Mailjet Response Status:', mailjetResponse.status);
    console.log('🔵 Mailjet Response OK:', mailjetResponse.ok);

    if (!mailjetResponse.ok) {
      const errorData = await mailjetResponse.json().catch(() => ({}));
      console.error('❌ Mailjet API Error:', errorData);
      console.error('❌ Mailjet Status:', mailjetResponse.status);
      console.error('❌ Mailjet Status Text:', mailjetResponse.statusText);
      
      let errorMessage = `Mailjet API error: ${mailjetResponse.status}`;
      if (errorData.ErrorMessage) {
        errorMessage += ` - ${errorData.ErrorMessage}`;
      } else if (errorData.Messages && errorData.Messages[0]?.Errors) {
        errorMessage += ` - ${errorData.Messages[0].Errors[0].ErrorMessage}`;
      } else {
        errorMessage += ` - ${mailjetResponse.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    const mailjetResult = await mailjetResponse.json().catch(() => ({}));
    console.log('✅ Mailjet Response:', JSON.stringify(mailjetResult, null, 2));
    console.log('✅ Email sent successfully via Mailjet!');

    return res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully',
    });
  } catch (error: any) {
    console.error('❌ Password reset error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Return detailed error for debugging (remove in production if needed)
    return res.status(500).json({
      error: 'Failed to process password reset request',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
