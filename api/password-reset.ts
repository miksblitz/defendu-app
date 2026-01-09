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

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
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
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const adminApp = getAdminApp();
    const auth = adminApp.auth();

    // Check if user exists
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (error: any) {
      // Don't reveal if user exists or not (security best practice)
      // Return success even if user doesn't exist
      return res.status(200).json({ 
        success: true, 
        message: 'If an account exists with this email, a password reset link has been sent.' 
      });
    }

    // Generate password reset link with custom action code settings
    // Note: Firebase Admin SDK doesn't support custom expiry less than 1 hour
    // We'll need to implement custom token expiry logic
    const actionCodeSettings = {
      url: `${process.env.API_BASE_URL || 'https://your-app-domain.com'}/resetpassword`,
      handleCodeInApp: false,
    };

    const resetLink = await auth.generatePasswordResetLink(email, actionCodeSettings);

    // Store token with expiry timestamp (5 minutes from now)
    const tokenExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes in milliseconds
    const tokenId = resetLink.split('oobCode=')[1]?.split('&')[0] || '';

    // Store token metadata in Realtime Database for validation
    const db = adminApp.database();
    await db.ref(`passwordResetTokens/${tokenId}`).set({
      email,
      createdAt: Date.now(),
      expiresAt: tokenExpiry,
      used: false,
    });

    // Add expiry timestamp to reset link
    const resetLinkWithExpiry = `${resetLink}&expiresAt=${tokenExpiry}`;

    // Get Mailjet credentials from environment
    const mailjetApiKey = process.env.MAILJET_API_KEY;
    const mailjetApiSecret = process.env.MAILJET_API_SECRET;
    const mailjetFromEmail = process.env.MAILJET_FROM_EMAIL || 'noreply@defendu.com';
    const mailjetFromName = process.env.MAILJET_FROM_NAME || 'Defendu';

    if (!mailjetApiKey || !mailjetApiSecret) {
      throw new Error('Mailjet credentials not configured');
    }

    // Send email via Mailjet
    const mailjetApiUrl = 'https://api.mailjet.com/v3.1/send';
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
          TextPart: `You requested a password reset. Click the link below to reset your password. This link will expire in 5 minutes.\n\n${resetLinkWithExpiry}\n\nIf you didn't request this, please ignore this email.`,
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
                    <a href="${resetLinkWithExpiry}" 
                       style="background-color: #00AABB; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
                      Reset Password
                    </a>
                  </div>
                  <p style="font-size: 12px; color: #666;">Or copy and paste this link into your browser:</p>
                  <p style="font-size: 12px; color: #00AABB; word-break: break-all;">${resetLinkWithExpiry}</p>
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
    const mailjetResponse = await fetch(mailjetApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify(emailData),
    });

    if (!mailjetResponse.ok) {
      const errorData = await mailjetResponse.json().catch(() => ({}));
      throw new Error(
        `Mailjet API error: ${mailjetResponse.status} - ${errorData.ErrorMessage || mailjetResponse.statusText}`
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully',
    });
  } catch (error: any) {
    console.error('❌ Password reset error:', error);
    return res.status(500).json({
      error: 'Failed to process password reset request',
      message: error.message,
    });
  }
}
