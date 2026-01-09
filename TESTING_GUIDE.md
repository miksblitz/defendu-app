# 🧪 Complete Testing Guide: Forgot Password Flow

## 📋 What to Do Next

### ✅ Step 1: Redeploy to Vercel (Required!)

Since we fixed the code and configuration, you need to redeploy:

**Option A: Automatic (if connected to Git)**
```bash
cd defendu-app
git add .
git commit -m "Fix ESLint errors and Vercel configuration"
git push
```
Vercel will automatically redeploy when you push.

**Option B: Manual Deployment**
```bash
cd defendu-app
vercel --prod
```

**Wait for deployment to complete** (usually 1-2 minutes). You'll see a success message with your deployment URL.

---

## 🧪 Step-by-Step Testing Guide

### Prerequisites Checklist

Before testing, make sure:

- [ ] Vercel deployment is complete
- [ ] All environment variables are set in Vercel Dashboard
- [ ] Your `.env` file has `EXPO_PUBLIC_API_BASE_URL` pointing to your Vercel URL
- [ ] You have a test email account ready
- [ ] Firebase Realtime Database is enabled
- [ ] You have at least one registered user account

---

## 🚀 Testing Steps

### Test 1: Verify API Endpoint is Working

**Goal:** Confirm the API endpoint is accessible (not 404)

1. Open your browser
2. Go to: `https://defendu-app.vercel.app/api/password-reset`
3. **Expected Result:**
   ```json
   {"error":"Method not allowed"}
   ```
   Status: **405** (Not 404!)
   
   ✅ **If you see this:** API is working!
   ❌ **If you see 404:** Check Vercel deployment logs

---

### Test 2: Test Forgot Password Request

**Goal:** Request a password reset and receive email

#### Step 2.1: Start Your Expo App

```bash
cd defendu-app
npm start
```

#### Step 2.2: Navigate to Forgot Password Screen

1. Open your app (on device/emulator or web)
2. Tap/click **"Forgot Password"** or navigate to the forgot password screen
3. You should see the forgot password form

#### Step 2.3: Enter Email Address

1. Enter a **valid email address** that is registered in your Firebase Auth
   - Example: `test@example.com` (use an email you have access to)
2. Tap/click **"Send Reset Link"**

#### Step 2.4: Check for Success Message

**Expected Result:**
- ✅ Loading indicator appears
- ✅ Success message: "Password reset email sent! Please check your inbox."
- ✅ Redirects to login screen (or shows success)

**If Error Occurs:**
- Check the error message
- Check Vercel function logs (Dashboard → Deployments → Functions → Logs)
- Verify environment variables are set

#### Step 2.5: Check Your Email

1. Open your email inbox (the one you entered)
2. Check **Spam/Junk folder** if not in inbox
3. Look for email from: `noreply@defendu.com` (or your configured email)
4. **Subject:** "Reset Your Password - Defendu"

**Expected Email Content:**
- ✅ Defendu branding
- ✅ "Reset Password" button
- ✅ Reset link (long URL with token)
- ✅ Message about 5-minute expiry

**If Email Not Received:**
- Wait 30-60 seconds (email delivery can be delayed)
- Check Mailjet dashboard for delivery status
- Check Vercel function logs for errors
- Verify Mailjet credentials in Vercel environment variables

---

### Test 3: Test Password Reset Link

**Goal:** Click reset link and reset password

#### Step 3.1: Click Reset Link

1. In the email, click the **"Reset Password"** button
   - OR copy the reset link and paste in browser
2. The app should open (if mobile) or browser should navigate

#### Step 3.2: Verify Token Validation

**Expected Behavior:**
- ✅ App opens to reset password screen
- ✅ Shows "Validating reset link..." briefly
- ✅ Shows password reset form (two password fields)

**If Error:**
- ❌ "Invalid or expired link" → Token might be expired or invalid
- ❌ "This link has expired" → Token expired (shouldn't happen if clicked immediately)
- Check Vercel function logs for validation errors

#### Step 3.3: Enter New Password

1. Enter a new password that meets requirements:
   - At least 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - At least one special character (!@#$%^&*...)

2. Confirm the password (enter same password again)

3. Tap/click **"Change Password"**

#### Step 3.4: Verify Password Reset Success

**Expected Result:**
- ✅ Loading indicator appears
- ✅ Success message: "Your password has been reset successfully!"
- ✅ Redirects to login screen

**If Error:**
- Check error message
- Verify password meets all requirements
- Check Vercel function logs

---

### Test 4: Test Login with New Password

**Goal:** Verify you can login with the new password

#### Step 4.1: Login with New Password

1. Go to login screen
2. Enter the **same email** you used for password reset
3. Enter the **new password** (the one you just set)
4. Tap/click **"Login"**

#### Step 4.2: Verify Login Success

**Expected Result:**
- ✅ Login successful
- ✅ Redirects to dashboard/home screen
- ✅ User is authenticated

**If Login Fails:**
- ❌ "Wrong password" → Password might not have been updated
- ❌ "User not found" → Check if user exists in Firebase Auth
- Try old password (should fail)
- Try new password again

---

### Test 5: Test Token Expiry (5 Minutes)

**Goal:** Verify tokens expire after 5 minutes

#### Step 5.1: Request New Reset Link

1. Request another password reset for the same email
2. **Don't click the link immediately**

#### Step 5.2: Wait 5+ Minutes

1. Wait at least 5 minutes and 1 second
2. You can check the time in the email (if timestamp is included)

#### Step 5.3: Try to Use Expired Link

1. Click the reset link from the email
2. Try to reset password

**Expected Result:**
- ❌ Error: "Token has expired. Please request a new password reset link."
- ❌ Cannot proceed with password reset

**If Token Still Works:**
- Check Vercel function logs
- Verify token expiry logic in `api/validate-reset-token.ts`
- Check Realtime Database for token expiry timestamp

---

### Test 6: Test Token Reuse Prevention

**Goal:** Verify used tokens cannot be reused

#### Step 6.1: Use a Reset Link

1. Request password reset
2. Click reset link
3. Successfully reset password

#### Step 6.2: Try to Use Same Link Again

1. Click the same reset link again (from email)
2. Try to reset password again

**Expected Result:**
- ❌ Error: "Token has already been used"
- ❌ Cannot reset password again with same token

---

## 🔍 Troubleshooting

### Issue: API Returns 404

**Solution:**
1. Check Vercel deployment is complete
2. Verify `vercel.json` is correct (or removed)
3. Check Vercel Dashboard → Deployments → Functions tab
4. Redeploy: `vercel --prod`

### Issue: Email Not Sending

**Check:**
1. Vercel environment variables:
   - `MAILJET_API_KEY`
   - `MAILJET_API_SECRET`
   - `MAILJET_FROM_EMAIL`
   - `MAILJET_FROM_NAME`

2. Mailjet Dashboard:
   - Go to [Mailjet Dashboard](https://app.mailjet.com)
   - Check "Statistics" → "Email Activity"
   - Look for your email

3. Vercel Function Logs:
   - Dashboard → Deployments → Latest → Functions → `api/password-reset` → Logs
   - Look for errors

### Issue: Token Validation Fails

**Check:**
1. Vercel environment variables:
   - `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64`
   - `API_BASE_URL`

2. Firebase Realtime Database:
   - Check if `passwordResetTokens` path exists
   - Verify database rules allow writes

3. Vercel Function Logs:
   - Check `api/validate-reset-token` logs

### Issue: Password Reset Doesn't Work

**Check:**
1. Vercel Function Logs:
   - Check `api/confirm-password-reset` logs
   - Look for Firebase Admin SDK errors

2. Firebase Console:
   - Verify user exists in Authentication
   - Check if password was updated

3. Network Tab (Browser DevTools):
   - Check API request/response
   - Verify status codes

---

## ✅ Success Checklist

After completing all tests, verify:

- [ ] API endpoint returns 405 (not 404) for GET requests
- [ ] Password reset email is received
- [ ] Reset link opens app/browser correctly
- [ ] Token validation works
- [ ] Password can be reset successfully
- [ ] Login works with new password
- [ ] Old password no longer works
- [ ] Tokens expire after 5 minutes
- [ ] Used tokens cannot be reused
- [ ] Error messages are user-friendly

---

## 📊 Test Results Template

Use this to track your testing:

```
Test Date: _______________
Tester: _______________
Environment: [ ] Development [ ] Staging [ ] Production

Test 1: API Endpoint
- Status: [ ] Pass [ ] Fail
- Notes: _______________

Test 2: Forgot Password Request
- Status: [ ] Pass [ ] Fail
- Email Received: [ ] Yes [ ] No
- Time to Receive: _______________
- Notes: _______________

Test 3: Password Reset Link
- Status: [ ] Pass [ ] Fail
- Token Validated: [ ] Yes [ ] No
- Notes: _______________

Test 4: Password Reset
- Status: [ ] Pass [ ] Fail
- Password Changed: [ ] Yes [ ] No
- Notes: _______________

Test 5: Login with New Password
- Status: [ ] Pass [ ] Fail
- Notes: _______________

Test 6: Token Expiry
- Status: [ ] Pass [ ] Fail
- Notes: _______________

Test 7: Token Reuse Prevention
- Status: [ ] Pass [ ] Fail
- Notes: _______________

Overall Status: [ ] All Pass [ ] Some Fail
Issues Found: _______________
```

---

## 🎯 Quick Test Commands

### Test API Endpoint (Browser)
```
https://defendu-app.vercel.app/api/password-reset
```

### Test API Endpoint (cURL)
```bash
# Test GET (should return 405)
curl https://defendu-app.vercel.app/api/password-reset

# Test POST (should send email)
curl -X POST https://defendu-app.vercel.app/api/password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@example.com"}'
```

### Check Vercel Logs
```bash
vercel logs
```

---

## 🚨 Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| 404 Error | Redeploy: `vercel --prod` |
| Email not sending | Check Mailjet credentials in Vercel |
| Token validation fails | Check Firebase service account in Vercel |
| Password reset fails | Check Vercel function logs |
| Old password still works | Clear browser cache, try again |

---

## 📞 Need Help?

1. Check `DEPLOYMENT_FIX.md` for deployment issues
2. Check `MIGRATION_REPORT.md` for technical details
3. Check Vercel Dashboard → Deployments → Logs
4. Check Firebase Console → Realtime Database

**Good luck with testing! 🚀**
