// api/paymongo-webhook.ts
// Vercel Serverless Function - PayMongo webhook handler
// Adds signature validation and idempotent credit application.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import * as admin from 'firebase-admin';
import {
  REQUIRED_WEBHOOK_ENV_VARS,
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

function toRawPayload(body: unknown): string {
  if (typeof body === 'string') return body;
  if (Buffer.isBuffer(body)) return body.toString('utf8');
  return JSON.stringify(body ?? {});
}

function parseSignatureHeader(headerValue: string): { timestamp?: string; signatures: string[] } {
  // Supports common formats like:
  // t=123456,v1=abc
  // ts=123456,signature=abc
  const signatures: string[] = [];
  let timestamp: string | undefined;

  for (const part of headerValue.split(',')) {
    const [rawKey, rawValue] = part.split('=');
    const key = (rawKey || '').trim().toLowerCase();
    const value = (rawValue || '').trim();
    if (!key || !value) continue;

    if (key === 't' || key === 'ts' || key === 'timestamp') {
      timestamp = value;
    } else if (key === 'v1' || key === 'signature' || key === 'sig') {
      signatures.push(value);
    }
  }

  return { timestamp, signatures };
}

function timingSafeEqualsHex(aHex: string, bHex: string): boolean {
  try {
    const a = new Uint8Array(Buffer.from(aHex, 'hex'));
    const b = new Uint8Array(Buffer.from(bHex, 'hex'));
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function validateWebhookSignature(req: VercelRequest, webhookSecret: string): boolean {
  const signatureHeader =
    (req.headers['paymongo-signature'] as string) ||
    (req.headers['x-paymongo-signature'] as string) ||
    (req.headers['Paymongo-Signature'] as string);

  if (!signatureHeader) return false;

  const { timestamp, signatures } = parseSignatureHeader(signatureHeader);
  if (!signatures.length) return false;

  const rawPayload = toRawPayload(req.body);

  const payloadWithTimestamp = timestamp ? `${timestamp}.${rawPayload}` : rawPayload;

  const digestWithTimestamp = crypto
    .createHmac('sha256', webhookSecret)
    .update(payloadWithTimestamp)
    .digest('hex');

  const digestRaw = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawPayload)
    .digest('hex');

  // Accept either timestamped or raw digest for compatibility.
  return signatures.some((sig) => timingSafeEqualsHex(sig, digestWithTimestamp) || timingSafeEqualsHex(sig, digestRaw));
}

function extractCheckoutSessionId(payload: any): string | null {
  return (
    payload?.data?.attributes?.data?.id ||
    payload?.data?.attributes?.data?.attributes?.id ||
    payload?.data?.attributes?.data?.attributes?.checkout_session_id ||
    null
  );
}

function extractMetadata(payload: any): {
  uid?: string;
  credits?: number;
  pricePHP?: number;
  paymentMethod?: string;
} {
  const direct = payload?.data?.attributes?.data?.attributes?.metadata;
  const alt = payload?.data?.attributes?.data?.metadata;
  const metadata = direct || alt || {};

  const creditsNum = Number(metadata?.credits);
  const priceNum = Number(metadata?.pricePHP);

  return {
    uid: metadata?.uid,
    credits: Number.isFinite(creditsNum) ? creditsNum : undefined,
    pricePHP: Number.isFinite(priceNum) ? priceNum : undefined,
    paymentMethod: metadata?.paymentMethod,
  };
}

async function verifyCheckoutSessionPaid(sessionId: string, paymongoSecretKey: string): Promise<boolean> {
  const response = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${sessionId}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${paymongoSecretKey}:`).toString('base64')}`,
    },
  });

  if (!response.ok) return false;

  const data = await response.json();
  const status = data?.data?.attributes?.status;
  return status === 'paid' || status === 'active';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Strict validation for all required webhook env vars
  const envValidation = validateEnvVars(REQUIRED_WEBHOOK_ENV_VARS);
  if (!envValidation.valid) {
    return res.status(503).json(getMissingEnvResponse(envValidation.missing));
  }

  const paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY!;
  const paymongoWebhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET!;

  try {
    // 1) Signature validation
    const signatureOk = validateWebhookSignature(req, paymongoWebhookSecret);
    if (!signatureOk) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const payload = req.body as any;
    const eventId = payload?.data?.id as string | undefined;
    const eventType = payload?.data?.attributes?.type as string | undefined;

    if (!eventId || !eventType) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const dbAdmin = admin.database(getAdminApp());

    // 2) Global idempotency by event ID
    const eventRef = dbAdmin.ref(`paymongoWebhookEvents/${eventId}`);
    const existingEventSnap = await eventRef.once('value');
    if (existingEventSnap.exists()) {
      return res.status(200).json({ ok: true, idempotent: true, reason: 'event_already_processed' });
    }

    // Record event as received immediately to avoid concurrent re-processing.
    await eventRef.set({
      eventId,
      eventType,
      status: 'received',
      receivedAt: admin.database.ServerValue.TIMESTAMP,
    });

    // Handle paid checkout events only. Other events are acknowledged.
    if (!eventType.includes('checkout_session') || !eventType.includes('paid')) {
      await eventRef.update({
        status: 'ignored',
        reason: 'unsupported_event_type',
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });
      return res.status(200).json({ ok: true, ignored: true });
    }

    const sessionId = extractCheckoutSessionId(payload);
    if (!sessionId) {
      await eventRef.update({
        status: 'failed',
        reason: 'missing_session_id',
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });
      return res.status(400).json({ error: 'Missing checkout session ID' });
    }

    // 3) Verify session state with PayMongo API before crediting.
    const isPaid = await verifyCheckoutSessionPaid(sessionId, paymongoSecretKey);
    if (!isPaid) {
      await eventRef.update({
        status: 'failed',
        reason: 'session_not_paid',
        sessionId,
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });
      return res.status(400).json({ error: 'Checkout session not paid' });
    }

    const metadata = extractMetadata(payload);
    const uid = metadata.uid;
    const credits = metadata.credits;

    if (!uid || !credits || credits <= 0) {
      await eventRef.update({
        status: 'failed',
        reason: 'missing_metadata',
        sessionId,
        metadata,
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });
      return res.status(400).json({ error: 'Missing uid/credits metadata' });
    }

    const pendingRef = dbAdmin.ref(`pendingPayments/${uid}/${sessionId}`);

    // 4) Per-session idempotency lock.
    const lockResult = await pendingRef.transaction((current) => {
      if (!current) return current;
      if (current.status === 'completed') return current;
      if (current.status === 'processing') return current;
      return {
        ...current,
        status: 'processing',
        processingEventId: eventId,
        processingAt: admin.database.ServerValue.TIMESTAMP,
      };
    });

    if (!lockResult.snapshot.exists()) {
      await eventRef.update({
        status: 'failed',
        reason: 'pending_payment_not_found',
        sessionId,
        uid,
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });
      return res.status(404).json({ error: 'Pending payment not found' });
    }

    const pendingData = lockResult.snapshot.val();
    if (pendingData.status === 'completed') {
      await eventRef.update({
        status: 'completed',
        idempotent: true,
        reason: 'already_completed_by_callback_or_webhook',
        sessionId,
        uid,
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });
      return res.status(200).json({ ok: true, idempotent: true });
    }

    if (pendingData.status === 'processing' && pendingData.processingEventId !== eventId) {
      await eventRef.update({
        status: 'ignored',
        reason: 'processing_locked_by_other_event',
        sessionId,
        uid,
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });
      return res.status(200).json({ ok: true, locked: true });
    }

    // 5) Credit wallet exactly once.
    const walletRef = dbAdmin.ref(`wallets/${uid}`);
    const walletSnap = await walletRef.once('value');
    const wallet = walletSnap.exists()
      ? walletSnap.val()
      : {
          uid,
          balance: 0,
          totalLoaded: 0,
          totalSpent: 0,
          createdAt: admin.database.ServerValue.TIMESTAMP,
        };

    const creditsToApply = Number(pendingData.credits || credits);
    const newBalance = Number(wallet.balance || 0) + creditsToApply;

    await walletRef.update({
      balance: newBalance,
      totalLoaded: Number(wallet.totalLoaded || 0) + creditsToApply,
      updatedAt: admin.database.ServerValue.TIMESTAMP,
    });

    const txRef = dbAdmin.ref(`walletTransactions/${uid}`).push();
    await txRef.set({
      transactionId: txRef.key,
      uid,
      type: 'top_up',
      amount: creditsToApply,
      balanceAfter: newBalance,
      description: `Top-up via ${(pendingData.paymentMethod || metadata.paymentMethod || 'PAYMENT').toString().toUpperCase()}`,
      paymentMethod: pendingData.paymentMethod || metadata.paymentMethod || 'card',
      paymentId: sessionId,
      phpAmount: Number(pendingData.pricePHP || metadata.pricePHP || 0),
      createdAt: admin.database.ServerValue.TIMESTAMP,
    });

    await pendingRef.update({
      status: 'completed',
      completedBy: 'webhook',
      completedEventId: eventId,
      completedAt: admin.database.ServerValue.TIMESTAMP,
    });

    await eventRef.update({
      status: 'completed',
      sessionId,
      uid,
      creditsApplied: creditsToApply,
      updatedAt: admin.database.ServerValue.TIMESTAMP,
    });

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('PayMongo webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
