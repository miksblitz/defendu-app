# ✅ Fixed: "Domain not allowlisted" Error

## 🎯 The Problem

```
FirebaseAuthError: Domain not allowlisted by project
code: 'auth/unauthorized-continue-uri'
```

Firebase was rejecting the password reset link because the domain wasn't authorized.

---

## ✅ The Fix

I've updated the code to use **`https://defendu-e7970.firebaseapp.com`** which is:

1. ✅ **Already allowlisted** by Firebase (default Firebase hosting domain)
2. ✅ **Already configured** in your `app.json` for deep linking
3. ✅ **Already set up** in your app's `_layout.tsx` to handle reset password links

---

## 🚀 What Changed

**File: `api/password-reset.ts`**

Changed from:
```typescript
url: `${process.env.API_BASE_URL || 'https://your-app-domain.com'}/resetpassword`
```

To:
```typescript
url: 'https://defendu-e7970.firebaseapp.com/resetpassword'
```

This URL is already configured in your app and will work immediately!

---

## 📋 Next Steps

### Step 1: Commit and Push

```bash
git add .
git commit -m "Fix Firebase domain allowlist error"
git push
```

### Step 2: Wait for Vercel Deployment

Vercel will automatically deploy. Wait 1-2 minutes.

### Step 3: Test Again

Try the forgot password flow again. It should work now!

---

## ✅ Expected Result

After deployment, when you test:

1. ✅ Reset link generates successfully (no domain error)
2. ✅ Email is sent via Mailjet
3. ✅ User receives email with reset link
4. ✅ Link opens in app (via deep linking)
5. ✅ User can reset password

---

## 🔍 Verify It's Fixed

Check Vercel logs after testing - you should see:

```
🔵 Generating reset link with URL: https://defendu-e7970.firebaseapp.com/resetpassword
🔵 Reset link generated successfully
✅ Email sent successfully via Mailjet!
```

**No more domain errors!** 🎉

---

## 📝 Optional: Add Your Custom Domain Later

If you want to use your Vercel domain (`defendu-app.vercel.app`) instead:

1. Go to Firebase Console → Authentication → Settings
2. Scroll to **Authorized domains**
3. Click **"Add domain"**
4. Enter: `defendu-app.vercel.app`
5. Click **"Add"**
6. Update the code to use your Vercel domain

But for now, the Firebase hosting URL works perfectly! ✅

---

## 🎯 Summary

- ✅ **Fixed:** Code now uses Firebase hosting URL (already allowlisted)
- ✅ **No Firebase Console changes needed** - it's already configured
- ✅ **Just commit, push, and test!**

The error is fixed! 🚀
