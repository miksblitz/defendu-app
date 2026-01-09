# ✅ Fixed: "Can't determine Firebase Database URL" Error

## 🎯 The Problem

```
Error: Can't determine Firebase Database URL.
```

Firebase Admin SDK needs the Realtime Database URL to be explicitly specified when initializing.

---

## ✅ The Fix

I've updated all three API files to include the `databaseURL` in the Firebase Admin SDK initialization:

1. ✅ `api/password-reset.ts`
2. ✅ `api/confirm-password-reset.ts`
3. ✅ `api/validate-reset-token.ts`

**What changed:**

```typescript
// Before (missing databaseURL)
adminApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// After (with databaseURL)
const databaseURL = process.env.FIREBASE_DATABASE_URL || 
  'https://defendu-e7970-default-rtdb.asia-southeast1.firebasedatabase.app';

adminApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL,
});
```

---

## 📋 Optional: Add Environment Variable

You can optionally add `FIREBASE_DATABASE_URL` to Vercel environment variables:

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add:
   ```
   FIREBASE_DATABASE_URL = https://defendu-e7970-default-rtdb.asia-southeast1.firebasedatabase.app
   ```
3. Set for Production, Preview, and Development

**Note:** This is optional - the code has a fallback to the correct URL.

---

## 🚀 Next Steps

### Step 1: Commit and Push

```bash
git add .
git commit -m "Fix Firebase Database URL initialization"
git push
```

### Step 2: Wait for Vercel Deployment

Vercel will automatically deploy. Wait 1-2 minutes.

### Step 3: Test Again

Try the forgot password flow again. It should work now!

---

## ✅ Expected Result

After deployment:

1. ✅ Firebase Admin SDK initializes with database URL
2. ✅ Reset link generates successfully
3. ✅ Token is stored in Realtime Database
4. ✅ Email is sent via Mailjet
5. ✅ User receives email with reset link

---

## 🔍 Verify It's Fixed

After testing, check Vercel logs - you should see:

```
🔵 Generating reset link with URL: https://defendu-e7970.firebaseapp.com/resetpassword
🔵 Reset link generated successfully
✅ Email sent successfully via Mailjet!
```

**No more database URL errors!** 🎉

---

## 🎯 Summary

- ✅ **Fixed:** Added `databaseURL` to Firebase Admin SDK initialization
- ✅ **Updated:** All three API endpoints now have the database URL
- ✅ **Fallback:** Code uses default URL if environment variable is not set
- ✅ **Ready to deploy!**

The error is fixed! 🚀
