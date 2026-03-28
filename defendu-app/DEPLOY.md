# Deploy Defendu API (Vercel) and run the app locally

## 1. Vercel project (one-time)

1. Import this repo in [Vercel](https://vercel.com).
2. **Root Directory** must be **`defendu-app`** (the folder that contains `api/` and `vercel.json`). If the repo root is `DEFENDU`, do not leave Root Directory empty.
3. Deploy **Production** from your main branch after every API change.

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)

Set for **Production** (and Preview if you use it):

| Variable | Purpose |
|----------|---------|
| `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` | Base64 of Firebase service account JSON (password reset, etc.) |
| `FIREBASE_DATABASE_URL` | Realtime Database URL (optional; code has a default) |
| `MAILJET_API_KEY` | Mailjet API key |
| `MAILJET_API_SECRET` | Mailjet secret |
| `MAILJET_FROM_EMAIL` | Verified sender in Mailjet |
| `MAILJET_FROM_NAME` | Display name (e.g. `Defendu`) |
| `POSE_DEVELOPER_EMAIL` | Optional; pose ticket recipient (default in code is `mikelsphotos3@gmail.com`) |
| `API_BASE_URL` | Optional; public site URL for reset links (default `https://defendu-app.vercel.app`) |

Redeploy after changing variables.

## 3. Verify the API from your machine

From the `defendu-app` folder:

```bash
npm run check:api
```

Optional: `set VERIFY_API_BASE=https://your-deployment.vercel.app` (Windows) or `VERIFY_API_BASE=... npm run check:api` (Unix) to test another URL.

You want **OPTIONS** on `/api/pose-developer-ticket` and `/api/password-reset` to return **200** with `access-control-allow-origin` (after a fresh deploy).

## 4. Local Expo (web) against production API

1. Copy **`.env.example`** to **`.env`** and set `EXPO_PUBLIC_API_BASE_URL` to your Vercel URL (no trailing slash).
2. Stop Expo, then start with a clean cache so env and JS update:

```bash
npx expo start --web --clear
```

3. Hard-refresh the browser (**Ctrl+Shift+R**) on `http://localhost:8082` (or whatever port Expo prints).

## 5. Pose developer ticket behavior

The app **POSTs** to `/api/pose-developer-ticket` first. If that route is missing or CORS blocks the call, it **falls back** to `/api/password-reset` with `action: "pose-developer-ticket"`. Both paths require the **latest** `api/*.ts` files on Vercel.

## 6. Git push

Commit and push `defendu-app` (including `api/pose-developer-ticket.ts` and `vercel.json`), then confirm Vercel finishes a **production** deployment before testing again.
