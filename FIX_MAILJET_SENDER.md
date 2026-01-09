# 🔧 Fix: Mailjet Sender Address Not Validated

## ⚠️ The Problem

Mailjet sent you an email saying:
> "We are contacting you as you (or one of your team members) tried to send an email with sender address: noreply@defendu.com. But this sender address has not been validated yet."

**This is why emails aren't being sent!** Mailjet requires sender addresses to be validated before they can send emails.

---

## ✅ Solution: Validate Sender Address in Mailjet

### Option 1: Validate `noreply@defendu.com` (Recommended if you own the domain)

1. **Go to Mailjet Dashboard:**
   - Visit: https://app.mailjet.com
   - Log in with your account

2. **Navigate to Sender Management:**
   - Click **Account Settings** (top right)
   - Click **Senders and domains** (in the left sidebar)
   - Or go directly to: https://app.mailjet.com/account/sender

3. **Add/Validate Sender:**
   - Click **"Add a sender"** or **"Add sender address"**
   - Enter: `noreply@defendu.com`
   - Click **"Add"**

4. **Verify the Email:**
   - Mailjet will send a verification email to `noreply@defendu.com`
   - **You need access to this email inbox** to verify it
   - Click the verification link in the email
   - Or use the verification code if provided

5. **Wait for Approval:**
   - Mailjet may need to approve the sender (can take a few minutes to 24 hours)
   - You'll receive an email when it's approved

---

## ✅ Solution: Use Your Personal Email (Quick Fix)

If you don't have access to `noreply@defendu.com` or want a quick fix:

### Step 1: Use a Verified Email Address

1. **Go to Mailjet Dashboard:**
   - Visit: https://app.mailjet.com
   - Go to **Account Settings** → **Senders and domains**

2. **Check Verified Senders:**
   - Look for emails that are already verified (usually your account email)
   - Note one that's verified (e.g., `your-email@gmail.com`)

3. **Update Environment Variable in Vercel:**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Find `MAILJET_FROM_EMAIL`
   - Change it to your verified email (e.g., `your-email@gmail.com`)
   - Click **Save**

4. **Redeploy:**
   - Go to Deployments → Latest → Three dots (⋯) → **Redeploy**
   - Wait 1-2 minutes

### Step 2: Update the Code (Optional - for better display name)

The code will automatically use the email you set in `MAILJET_FROM_EMAIL`. The display name is set by `MAILJET_FROM_NAME` (currently "Defendu").

---

## 🎯 Quick Fix Steps (Using Your Email)

1. **Check Mailjet for verified senders:**
   - Go to https://app.mailjet.com/account/sender
   - Find an email that's already verified

2. **Update Vercel environment variable:**
   - Vercel Dashboard → Settings → Environment Variables
   - Update `MAILJET_FROM_EMAIL` to your verified email
   - Save

3. **Redeploy:**
   - Deployments → Latest → Redeploy

4. **Test again:**
   - Try forgot password flow
   - Email should send successfully!

---

## 📋 Environment Variables Checklist

Make sure these are set in Vercel:

- [x] `MAILJET_API_KEY` = `a932599cb1b71fb8c5d7e435b10d41c3`
- [x] `MAILJET_API_SECRET` = `297310710a264a52ffe51cdfecce17e0`
- [ ] `MAILJET_FROM_EMAIL` = **Use a verified email address** (e.g., your Gmail)
- [x] `MAILJET_FROM_NAME` = `Defendu`
- [x] `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` = (your base64 string)
- [x] `FIREBASE_DATABASE_URL` = `https://defendu-e7970-default-rtdb.asia-southeast1.firebasedatabase.app`

---

## 🔍 How to Check if Sender is Verified

1. Go to https://app.mailjet.com/account/sender
2. Look for your sender address
3. Check the status:
   - ✅ **Verified** = Good to go!
   - ⚠️ **Pending** = Waiting for verification
   - ❌ **Unverified** = Needs verification

---

## 💡 Best Practices

### For Production (Later):

1. **Use a domain you own:**
   - Set up `noreply@defendu.com` properly
   - Verify the domain in Mailjet (better deliverability)
   - This requires domain DNS configuration

2. **Use a professional email:**
   - `support@defendu.com`
   - `hello@defendu.com`
   - `no-reply@defendu.com`

### For Now (Quick Fix):

- Use your personal Gmail or email that's already verified
- This will work immediately
- You can change it later when you set up your domain

---

## ✅ After Fixing

Once you've validated the sender or updated to a verified email:

1. ✅ Update `MAILJET_FROM_EMAIL` in Vercel
2. ✅ Redeploy
3. ✅ Test forgot password
4. ✅ Check your email inbox - you should receive the reset email!

---

## 🎯 Summary

**The Issue:** `noreply@defendu.com` is not validated in Mailjet.

**Quick Fix:** 
1. Use a verified email address (your Gmail)
2. Update `MAILJET_FROM_EMAIL` in Vercel
3. Redeploy

**Long-term Fix:**
1. Validate `noreply@defendu.com` in Mailjet
2. Or set up your domain properly

**The emails will work once you use a verified sender address!** 🚀
