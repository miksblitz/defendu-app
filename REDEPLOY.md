# 🚀 How to Redeploy to Vercel

## Quick Method: Using Git (Recommended)

If your project is connected to Git/GitHub:

### Step 1: Commit Your Changes

```bash
cd defendu-app
git add .
git commit -m "Fix CORS - handle OPTIONS requests for password reset"
git push
```

**That's it!** Vercel will automatically detect the push and redeploy.

---

## Manual Method: Using Vercel CLI

If you want to deploy manually:

### Step 1: Make Sure You're in the Right Directory

```bash
cd C:\Users\mikel\OneDrive\Desktop\DEFENDU\defendu-app
```

### Step 2: Deploy to Production

```bash
vercel --prod
```

**Follow the prompts:**
- If asked to link project, say `Y` and select your existing project
- If asked about settings, you can usually just press Enter for defaults

**Wait for deployment to complete** (usually 1-2 minutes)

---

## Method 3: Using Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project: `defendu-app`
3. Go to **Deployments** tab
4. Find the latest deployment
5. Click the **three dots** (⋯) menu
6. Click **Redeploy**
7. Select **Use existing Build Cache** (optional)
8. Click **Redeploy**

---

## Verify Deployment

After redeployment:

1. **Check deployment status:**
   - Go to Vercel Dashboard → Deployments
   - Latest deployment should show "Ready" ✅

2. **Test API endpoint:**
   - Visit: `https://defendu-app.vercel.app/api/password-reset`
   - Should see: `{"error":"Method not allowed"}` (Status 405)
   - This confirms API is deployed

3. **Test OPTIONS request (CORS):**
   - The OPTIONS request should now return 200 (not 405)
   - Check Vercel logs to verify

---

## Quick Commands Reference

```bash
# Navigate to project
cd C:\Users\mikel\OneDrive\Desktop\DEFENDU\defendu-app

# Deploy to production
vercel --prod

# Deploy to preview (for testing)
vercel

# Check deployment status
vercel ls

# View logs
vercel logs
```

---

## After Redeployment

1. ✅ Wait for deployment to complete
2. ✅ Test forgot password in your app
3. ✅ Check terminal logs for success
4. ✅ Check email inbox

**The CORS fix should now work!** 🎉
