// api/payment-success.ts
// Vercel Serverless Function - PayMongo payment success callback
// Verifies payment and credits the user's wallet

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import {
  REQUIRED_PAYMENT_ENV_VARS,
  validateEnvVars,
} from './_lib/envConfig';

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
    const databaseURL = process.env.FIREBASE_DATABASE_URL ||
      'https://defendu-e7970-default-rtdb.asia-southeast1.firebasedatabase.app';
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      databaseURL,
    });
  }
  return adminApp;
}

/**
 * GET /api/payment-success?uid=...&credits=...&session_id=...
 * Called by PayMongo after successful checkout.
 * Verifies session, credits the wallet, and redirects to the app.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Strict validation for all required payment env vars
  const envValidation = validateEnvVars(REQUIRED_PAYMENT_ENV_VARS);
  if (!envValidation.valid) {
    console.error('Missing env vars:', envValidation.missing.join(', '));
    return res.redirect(302, 'defenduapp://wallet?status=config_error');
  }

  try {
    const { uid, credits, session_id } = req.query;

    if (!uid || !credits || !session_id) {
      return res.status(400).send('Missing parameters');
    }

    const uidStr = String(uid);
    const creditsNum = Number(credits);
    const sessionIdStr = String(session_id);

    if (isNaN(creditsNum) || creditsNum <= 0) {
      return res.status(400).send('Invalid credits amount');
    }

    const paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY!;

    // Verify the payment session with PayMongo
    const verifyResponse = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${sessionIdStr}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(paymongoSecretKey + ':').toString('base64')}`,
      },
    });

    if (!verifyResponse.ok) {
      return res.status(400).send('Failed to verify payment');
    }

    const sessionData = await verifyResponse.json();
    const sessionStatus = sessionData.data?.attributes?.status;

    if (sessionStatus !== 'active' && sessionStatus !== 'paid') {
      return res.status(400).send('Payment not completed');
    }

    const app = getAdminApp();
    const dbAdmin = admin.database();

    // Check if this session was already processed (idempotency)
    const pendingRef = dbAdmin.ref(`pendingPayments/${uidStr}/${sessionIdStr}`);
    const pendingSnap = await pendingRef.once('value');

    if (!pendingSnap.exists()) {
      // Already processed or invalid
      return res.redirect(302, 'defenduapp://wallet?status=already_processed');
    }

    const pendingData = pendingSnap.val();
    if (pendingData.status === 'completed' || pendingData.status === 'processing') {
      return res.redirect(302, 'defenduapp://wallet?status=already_processed');
    }

    // Credit the user's wallet
    const walletRef = dbAdmin.ref(`wallets/${uidStr}`);
    const walletSnap = await walletRef.once('value');
    const currentWallet = walletSnap.exists() ? walletSnap.val() : {
      uid: uidStr,
      balance: 0,
      totalLoaded: 0,
      totalSpent: 0,
      createdAt: admin.database.ServerValue.TIMESTAMP,
    };

    const newBalance = (currentWallet.balance || 0) + creditsNum;
    await walletRef.update({
      balance: newBalance,
      totalLoaded: (currentWallet.totalLoaded || 0) + creditsNum,
      updatedAt: admin.database.ServerValue.TIMESTAMP,
    });

    // Record the transaction
    const txRef = dbAdmin.ref(`walletTransactions/${uidStr}`).push();
    await txRef.set({
      transactionId: txRef.key,
      uid: uidStr,
      type: 'top_up',
      amount: creditsNum,
      balanceAfter: newBalance,
      description: `Top-up via ${pendingData.paymentMethod?.toUpperCase() || 'PAYMENT'}`,
      paymentMethod: pendingData.paymentMethod || 'card',
      paymentId: sessionIdStr,
      phpAmount: pendingData.pricePHP || 0,
      createdAt: admin.database.ServerValue.TIMESTAMP,
    });

    // Mark pending payment as completed
    await pendingRef.update({
      status: 'completed',
      completedBy: 'callback',
      completedAt: admin.database.ServerValue.TIMESTAMP,
    });

    // Redirect to app with success deep link
    return res.redirect(302, `defenduapp://wallet?status=success&credits=${creditsNum}`);
  } catch (error: any) {
    console.error('Payment success handler error:', error);
    return res.redirect(302, 'defenduapp://wallet?status=error');
  }
}
