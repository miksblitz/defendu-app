# 🔧 Fix: "Domain not allowlisted by project" Error

## ⚠️ The Error

```
FirebaseAuthError: Domain not allowlisted by project
code: 'auth/unauthorized-continue-uri'
message: 'Domain not allowlisted by project'
```

## 🎯 The Problem

Firebase requires the domain/URL used in password reset links to be **authorized** in Firebase Console. The URL in `actionCodeSettings.url` is not allowlisted.

---

## ✅ Solution: Add Domain to Firebase Authorized Domains

### Step 1: Go to Firebase Console

1. Visit: https://console.firebase.google.com
2. Select your project: **`defendu-e7970`**
3. Click **Authentication** (left sidebar)
4. Click **Settings** tab (at the top)
5. Scroll down to **Authorized domains**

### Step 2: Add Your Domain

You need to add the domain that will be used in the reset link.

**Add these domains:**

1. **`defendu-app.vercel.app`** (your Vercel domain)
2. **`localhost`** (for local testing)
3. **Your custom domain** (if you have one)

**How to add:**
1. Click **"Add domain"** button
2. Enter: `defendu-app.vercel.app`
3. Click **"Add"**
4. Repeat for `localhost` if needed

### Step 3: Alternative - Use Firebase Hosting URL

If you don't want to add Vercel domain, you can use Firebase's default domain:

- `https://defendu-e7970.firebaseapp.com`

This is already allowlisted by default.

---

## 🔧 Quick Fix: Update the Code

I've updated the code to use a fallback URL. But you still need to:

**Option 1: Add Vercel domain to Firebase (Recommended)**
- Add `defendu-app.vercel.app` to authorized domains
- The code will use: `https://defendu-app.vercel.app/resetpassword`

**Option 2: Use Firebase hosting URL**
- The code will use: `https://defendu-e7970.firebaseapp.com/resetpassword`
- This is already allowlisted

---

## 📝 Step-by-Step Fix

### Step 1: Add Domain to Firebase

1. Firebase Console → Authentication → Settings
2. Scroll to **Authorized domains**
3. Click **"Add domain"**
4. Enter: `defendu-app.vercel.app`
5. Click **"Add"**

### Step 2: Set Environment Variable

In Vercel, make sure `API_BASE_URL` is set:

```
API_BASE_URL = https://defendu-app.vercel.app
```

### Step 3: Redeploy

After adding the domain and setting the environment variable:

1. Commit and push the code changes:
   ```bash
   git add .
   git commit -m "Fix Firebase domain allowlist issue"
   git push
   ```

2. Or redeploy in Vercel Dashboard

### Step 4: Test Again

Try forgot password again - it should work now!

---

## 🎯 What I Fixed in the Code

1. ✅ Updated `actionCodeSettings` to use proper URL
2. ✅ Added fallback to Firebase hosting URL (already allowlisted)
3. ✅ Set `handleCodeInApp: true` for better mobile support
4. ✅ Added logging to show which URL is being used

---

## ✅ Expected Result

After fixing:

1. Domain is allowlisted in Firebase
2. Reset link generates successfully
3. Email is sent via Mailjet
4. User receives email with reset link

---

## 🔍 Verify It's Fixed

After redeploying, check Vercel logs - you should see:

```
🔵 Generating reset link with URL: https://defendu-app.vercel.app/resetpassword
🔵 Reset link generated successfully
✅ Email sent successfully via Mailjet!
```

Instead of the domain error.

---

## 📋 Quick Checklist

- [ ] Add `defendu-app.vercel.app` to Firebase authorized domains
- [ ] Set `API_BASE_URL` in Vercel environment variables
- [ ] Redeploy to Vercel
- [ ] Test forgot password again
- [ ] Check Vercel logs - should see success messages

**The domain must be added to Firebase Console!** This is the fix! 🎯
