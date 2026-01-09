# 🔧 Fix 500 Error: Password Reset Not Working

## ⚠️ The Problem

You're getting a **500 Internal Server Error**. This means the API is crashing on the server side.

**The error is happening in Vercel, not in your app!**

---

## 🔍 Step 1: Check Vercel Function Logs (CRITICAL!)

This will show you the **exact error**:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on **`defendu-app`** project
3. Click **Deployments** tab
4. Click on the **latest deployment** (most recent)
5. Click **Functions** tab (at the top)
6. Click on **`api/password-reset`**
7. Click **Logs** tab
8. **Look for error messages** - you'll see something like:
   ```
   ❌ Password reset error: [error details]
   ❌ Error message: [specific error]
   ```

**Copy the exact error message you see!**

---

## 🎯 Most Common Causes & Fixes

### Cause 1: Missing Environment Variables (90% of cases)

**Error you'll see:**
- `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 environment variable is not set`
- `Mailjet credentials not configured`

**Fix:**
1. Go to Vercel Dashboard → **Settings** → **Environment Variables**
2. Add these variables (for Production, Preview, Development):

   ```
   MAILJET_API_KEY = a932599cb1b71fb8c5d7e435b10d41c3
   MAILJET_API_SECRET = 297310710a264a52ffe51cdfecce17e0
   MAILJET_FROM_EMAIL = noreply@defendu.com
   MAILJET_FROM_NAME = Defendu
   FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 = [your base64 string]
   API_BASE_URL = https://defendu-app.vercel.app
   ```

3. **After adding, you MUST redeploy:**
   - Go to Deployments → Latest → Three dots (⋯) → **Redeploy**

### Cause 2: Wrong Mailjet Credentials

**Error you'll see:**
- `Mailjet API error: 401` (Unauthorized)

**Fix:**
- Double-check your Mailjet API key and secret
- Make sure there are no extra spaces
- Verify in Mailjet dashboard that credentials are correct

### Cause 3: Firebase Service Account Error

**Error you'll see:**
- `Failed to initialize Firebase Admin SDK`
- `Invalid service account`

**Fix:**
- Check `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` is correct
- Make sure it's the full base64 string (no line breaks)
- Re-convert your service account JSON to base64 if needed

### Cause 4: Mailjet From Email Not Verified

**Error you'll see:**
- `Mailjet API error: 400`
- Email validation error

**Fix:**
1. Go to [Mailjet Dashboard](https://app.mailjet.com)
2. Go to **Account Settings** → **Sender Addresses**
3. Verify `noreply@defendu.com` (or your from email)
4. Or use a verified email address

---

## 🚀 Quick Fix Steps

### Step 1: Check Vercel Logs
- Go to Vercel Dashboard → Deployments → Latest → Functions → `api/password-reset` → Logs
- **Copy the exact error message**

### Step 2: Verify Environment Variables
- Go to Vercel Dashboard → Settings → Environment Variables
- Check if all required variables are set
- **Most likely missing:** `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` or Mailjet credentials

### Step 3: Add Missing Variables
- Add any missing environment variables
- Make sure they're set for **Production, Preview, and Development**

### Step 4: Redeploy
- Go to Deployments → Latest → Three dots → **Redeploy**
- Wait for deployment to complete

### Step 5: Test Again
- Try forgot password again
- Check logs again if it still fails

---

## 📋 Environment Variables Checklist

Make sure these are ALL set in Vercel:

- [ ] `MAILJET_API_KEY` = `a932599cb1b71fb8c5d7e435b10d41c3`
- [ ] `MAILJET_API_SECRET` = `297310710a264a52ffe51cdfecce17e0`
- [ ] `MAILJET_FROM_EMAIL` = `noreply@defendu.com`
- [ ] `MAILJET_FROM_NAME` = `Defendu`
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` = (your base64 string)
- [ ] `API_BASE_URL` = `https://defendu-app.vercel.app`

**All must be set for Production, Preview, and Development!**

---

## 🔍 How to Get the Exact Error

1. **Check Vercel Logs** (most important):
   - Dashboard → Deployments → Latest → Functions → `api/password-reset` → Logs
   - Look for lines starting with `❌`

2. **Check Browser Console**:
   - F12 → Console tab
   - Look for the error object
   - Expand it to see `message` and `details`

3. **Test API Directly**:
   ```bash
   curl -X POST https://defendu-app.vercel.app/api/password-reset \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```
   - This will show the error response

---

## ✅ After Fixing

Once you fix the environment variables and redeploy:

1. Wait 1-2 minutes for deployment
2. Try forgot password again
3. Check Vercel logs - should see:
   ```
   ✅ Email sent successfully via Mailjet!
   ```
4. Check your email inbox

---

## 🎯 Most Likely Issue

**90% chance it's missing environment variables in Vercel!**

Check Vercel Dashboard → Settings → Environment Variables and make sure all are set, then **redeploy**.

**The Vercel logs will tell you exactly what's missing!** Check them first! 🔍
