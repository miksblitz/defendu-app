// api/create-payment.ts
// Vercel Serverless Function for PayMongo payment creation
// Supports GCash, Maya, and Card payments in Philippine Peso (PHP)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import {
  REQUIRED_PAYMENT_ENV_VARS,
  validateEnvVars,
  getMissingEnvResponse,
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
 * POST /api/create-payment
 * Body: { uid, credits, pricePHP, paymentMethod }
 * paymentMethod: 'gcash' | 'maya' | 'card'
 *
 * Creates a PayMongo checkout session and returns the checkout URL.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Strict validation for all required payment env vars
  const envValidation = validateEnvVars(REQUIRED_PAYMENT_ENV_VARS);
  if (!envValidation.valid) {
    return res.status(503).json(getMissingEnvResponse(envValidation.missing));
  }

  const paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY!;

  try {
    const { uid, credits, pricePHP, paymentMethod } = req.body;

    if (!uid || !credits || !pricePHP || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required fields: uid, credits, pricePHP, paymentMethod' });
    }

    // Validate payment method
    const allowedMethods = ['gcash', 'maya', 'card'];
    if (!allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method. Use: gcash, maya, or card' });
    }

    // Validate numeric fields
    if (typeof credits !== 'number' || credits <= 0 || typeof pricePHP !== 'number' || pricePHP <= 0) {
      return res.status(400).json({ error: 'Invalid credits or price amount' });
    }

    // Verify that user exists in Firebase
    const app = getAdminApp();
    const dbAdmin = admin.database();
    const userSnap = await dbAdmin.ref(`users/${uid}`).once('value');
    if (!userSnap.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Map payment method to PayMongo payment_method_types
    const paymentMethodTypes: string[] = [];
    if (paymentMethod === 'gcash') paymentMethodTypes.push('gcash');
    else if (paymentMethod === 'maya') paymentMethodTypes.push('paymaya');
    else if (paymentMethod === 'card') paymentMethodTypes.push('card');

    const baseUrl = process.env.APP_BASE_URL || 'https://defendu.vercel.app';

    // Create PayMongo Checkout Session
    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(paymongoSecretKey + ':').toString('base64')}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: [
              {
                name: `Defendu Credits (${credits} credits)`,
                quantity: 1,
                amount: Math.round(pricePHP * 100), // PayMongo uses centavos
                currency: 'PHP',
                description: `Top-up ${credits} credits to your Defendu wallet`,
              },
            ],
            payment_method_types: paymentMethodTypes,
            description: `Defendu Wallet Top-Up: ${credits} credits`,
            success_url: `${baseUrl}/api/payment-success?uid=${encodeURIComponent(uid)}&credits=${credits}&session_id={id}`,
            cancel_url: `${baseUrl}/api/payment-cancel`,
            metadata: {
              uid,
              credits: String(credits),
              pricePHP: String(pricePHP),
              paymentMethod,
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('PayMongo error:', JSON.stringify(errorData));
      return res.status(502).json({ error: 'Failed to create payment session' });
    }

    const result = await response.json();
    const checkoutUrl = result.data.attributes.checkout_url;
    const sessionId = result.data.id;

    // Store pending payment in Firebase for verification later
    await dbAdmin.ref(`pendingPayments/${uid}/${sessionId}`).set({
      uid,
      credits,
      pricePHP,
      paymentMethod,
      sessionId,
      status: 'pending',
      createdAt: admin.database.ServerValue.TIMESTAMP,
    });

    return res.status(200).json({
      checkoutUrl,
      sessionId,
    });
  } catch (error: any) {
    console.error('Payment creation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
