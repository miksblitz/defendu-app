# Vercel Environment Variables Setup

This document lists all required environment variables for the Defendu payment system.

## Required Environment Variables

### PayMongo Integration

| Variable Name | Required For | Description |
|---------------|--------------|-------------|
| `PAYMONGO_SECRET_KEY` | Payment & Webhook | PayMongo API secret key (starts with `sk_`) |
| `PAYMONGO_WEBHOOK_SECRET` | Webhook | Secret for validating PayMongo webhook signatures |
| `PAYMONGO_MONITOR_KEY` | Diagnostics | Custom key for authenticating monitor endpoint access |
| `APP_BASE_URL` | Payment | Base URL for payment callbacks (e.g., `https://defendu.vercel.app`) |

### Firebase Admin

| Variable Name | Required For | Description |
|---------------|--------------|-------------|
| `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` | All API endpoints | Base64-encoded Firebase service account JSON |
| `FIREBASE_DATABASE_URL` | All API endpoints | Firebase Realtime Database URL |

## Where to Set Variables

1. Go to **Vercel Dashboard** > Your Project > **Settings** > **Environment Variables**
2. Add each variable for the appropriate environments:
   - **Production**: Required for live payments
   - **Preview**: Optional, for testing PRs
   - **Development**: Optional, for local testing

## Step-by-Step Setup

### 1. Set PAYMONGO_SECRET_KEY
- Get from: PayMongo Dashboard > Developers > API Keys
- Use the **Secret Key** (not the Public Key)
- Format: `sk_live_...` (production) or `sk_test_...` (test mode)

### 2. Set PAYMONGO_WEBHOOK_SECRET
- Get from: PayMongo Dashboard > Developers > Webhooks
- Create a webhook pointing to: `https://defendu.vercel.app/api/paymongo-webhook`
- Copy the **Webhook Secret** shown after creating the webhook

### 3. Set PAYMONGO_MONITOR_KEY
- Generate a random secure string (e.g., 32+ characters)
- This authenticates access to `/api/paymongo-monitor`

### 4. Set APP_BASE_URL
- Set to your Vercel deployment URL
- Example: `https://defendu.vercel.app`

### 5. Set FIREBASE_SERVICE_ACCOUNT_KEY_BASE64
- Get your service account JSON from Firebase Console > Project Settings > Service Accounts
- Base64 encode the entire JSON file:
  ```bash
  base64 -w 0 < your-service-account.json
  ```
- Paste the encoded string as the variable value

### 6. Set FIREBASE_DATABASE_URL
- Get from: Firebase Console > Realtime Database
- Format: `https://your-project-id.firebaseio.com` or with region suffix

## After Setting Variables

**IMPORTANT: Redeploy Required**

Environment variable changes only take effect after a new deployment:
1. Push a new commit to trigger auto-deploy, OR
2. Go to Vercel Dashboard > Deployments > click "..." on latest > **Redeploy**

## Verifying Setup

After deployment, verify all variables are set using the monitor endpoint:

```bash
curl -H "Authorization: Bearer YOUR_MONITOR_KEY" \
  https://defendu.vercel.app/api/paymongo-monitor
```

The response includes a `readiness` object:
```json
{
  "readiness": {
    "allReady": true,
    "checklist": {
      "PAYMONGO_SECRET_KEY": true,
      "PAYMONGO_WEBHOOK_SECRET": true,
      "PAYMONGO_MONITOR_KEY": true,
      "APP_BASE_URL": true,
      "FIREBASE_SERVICE_ACCOUNT_KEY_BASE64": true,
      "FIREBASE_DATABASE_URL": true
    },
    "missingCount": 0,
    "missingVars": []
  }
}
```

If any variable shows `false`, set it in Vercel and redeploy.

## API Endpoint Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| `200` | Success | All good |
| `401` | Unauthorized | Check auth headers or `PAYMONGO_MONITOR_KEY` |
| `503` | Service Unavailable | Missing env vars - check `missing` array in response |

## Quick Checklist

- [ ] `PAYMONGO_SECRET_KEY` set in Vercel
- [ ] `PAYMONGO_WEBHOOK_SECRET` set in Vercel
- [ ] `PAYMONGO_MONITOR_KEY` set in Vercel
- [ ] `APP_BASE_URL` set in Vercel
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` set in Vercel
- [ ] `FIREBASE_DATABASE_URL` set in Vercel
- [ ] PayMongo webhook created pointing to `/api/paymongo-webhook`
- [ ] Redeployed after setting all variables
- [ ] Verified with `/api/paymongo-monitor` endpoint
