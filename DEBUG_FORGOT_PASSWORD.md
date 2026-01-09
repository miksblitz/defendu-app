# 🔍 Debug: Forgot Password Email Not Sending

## 🎯 Quick Checklist

Before debugging, verify:

- [ ] Vercel API is deployed
- [ ] Environment variables are set in Vercel
- [ ] `EXPO_PUBLIC_API_BASE_URL` is correct in `.env`
- [ ] Mailjet credentials are configured
- [ ] You're using a registered email address

---

## 📍 Step 1: Check Terminal/Console Logs

When you click "Send Reset Link", check your terminal for:

**Expected Success:**
```
✅ API call successful
✅ Password reset email sent
```

**Expected Errors:**
```
❌ Failed to send password reset email
❌ Network error
❌ API error: [error details]
```

**What to look for:**
- Any error messages
- The API URL being called
- Response status codes

---

## 📍 Step 2: Check Browser Console (If Testing on Web)

1. Open Developer Tools (F12)
2. Go to **Console** tab
3. Try forgot password again
4. Look for:
   - API request errors
   - Network errors
   - Response messages

5. Go to **Network** tab
6. Filter by: `password-reset` or `api`
7. Click on the request
8. Check:
   - **Status code** (200 = success, 400/500 = error)
   - **Response** tab (see error message)
   - **Headers** tab (verify API URL)

---

## 📍 Step 3: Verify Vercel API is Working

### Test 1: Check API Endpoint

Visit in browser:
```
https://defendu-app.vercel.app/api/password-reset
```

**Expected:**
```json
{"error":"Method not allowed"}
```
Status: **405** (This means API exists!)

**If you see 404:**
- API not deployed
- Wrong URL
- Need to redeploy

### Test 2: Test API with cURL (Optional)

```bash
curl -X POST https://defendu-app.vercel.app/api/password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

**Expected Response:**
```json
{"success":true,"message":"Password reset email sent successfully"}
```

**If Error:**
- Check the error message
- Verify environment variables in Vercel

---

## 📍 Step 4: Check Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `defendu-app`
3. Go to **Settings** → **Environment Variables**
4. Verify these are set:
   - ✅ `MAILJET_API_KEY` = `a932599cb1b71fb8c5d7e435b10d41c3`
   - ✅ `MAILJET_API_SECRET` = `297310710a264a52ffe51cdfecce17e0`
   - ✅ `MAILJET_FROM_EMAIL` = `noreply@defendu.com`
   - ✅ `MAILJET_FROM_NAME` = `Defendu`
   - ✅ `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` = (your base64 string)
   - ✅ `API_BASE_URL` = (your Vercel URL)

**If missing:**
- Add them
- Redeploy: Go to Deployments → Latest → Three dots → Redeploy

---

## 📍 Step 5: Check Vercel Function Logs

1. Go to Vercel Dashboard
2. Click **Deployments** tab
3. Click on latest deployment
4. Click **Functions** tab
5. Click on `api/password-reset`
6. Check **Logs** tab

**Look for:**
- ✅ "Password reset email sent via Mailjet"
- ❌ "Mailjet API error"
- ❌ "Failed to send email"
- ❌ Any error messages

**Common Errors:**
- `Mailjet credentials not configured` → Environment variables missing
- `Mailjet API error: 401` → Wrong API key/secret
- `Mailjet API error: 400` → Invalid email format or Mailjet config issue

---

## 📍 Step 6: Check Mailjet Dashboard

1. Go to [Mailjet Dashboard](https://app.mailjet.com)
2. Sign in
3. Go to **Statistics** → **Email Activity**
4. Look for recent emails

**What to check:**
- Email delivery status
- Bounce/spam reports
- Any errors

**If no emails in Mailjet:**
- API might not be calling Mailjet
- Check Vercel function logs
- Verify Mailjet credentials

---

## 📍 Step 7: Verify API Base URL

Check your `.env` file:

```bash
EXPO_PUBLIC_API_BASE_URL=https://defendu-app.vercel.app
```

**Make sure:**
- URL matches your actual Vercel deployment URL
- No trailing slash
- Uses `https://` not `http://`

**To find your Vercel URL:**
1. Go to Vercel Dashboard
2. Click on your project
3. Copy the deployment URL (e.g., `https://defendu-app.vercel.app`)

---

## 🐛 Common Issues & Fixes

### Issue 1: "Network Error" or "Failed to fetch"

**Cause:** API not deployed or wrong URL

**Fix:**
1. Verify Vercel deployment is complete
2. Check `EXPO_PUBLIC_API_BASE_URL` in `.env`
3. Restart app: `npm start -- --clear`

### Issue 2: "API error: 500" or "Internal Server Error"

**Cause:** Server-side error (Mailjet, Firebase, etc.)

**Fix:**
1. Check Vercel function logs (see Step 5)
2. Check environment variables are set
3. Verify Mailjet credentials are correct

### Issue 3: "API error: 401" (Unauthorized)

**Cause:** Mailjet API credentials wrong

**Fix:**
1. Verify `MAILJET_API_KEY` and `MAILJET_API_SECRET` in Vercel
2. Double-check credentials are correct
3. Redeploy after fixing

### Issue 4: Email Not Received (But API Returns Success)

**Cause:** Email might be in spam, or Mailjet issue

**Fix:**
1. Check spam/junk folder
2. Wait 1-2 minutes (email delivery can be delayed)
3. Check Mailjet dashboard for delivery status
4. Verify `MAILJET_FROM_EMAIL` is verified in Mailjet account

### Issue 5: "User not found" Error

**Cause:** Email not registered in Firebase Auth

**Fix:**
- Use an email that's actually registered
- Register the user first, then try forgot password

---

## 🔧 Enhanced Debugging

I'll add better error logging to show exactly what's happening. Check the updated code for detailed error messages.

---

## 📝 Step-by-Step Debug Process

1. **Check Terminal Logs**
   - Look for error messages when clicking "Send Reset Link"
   - Copy exact error message

2. **Check Browser Console** (if web)
   - F12 → Console tab
   - Look for API errors
   - Check Network tab for failed requests

3. **Test API Directly**
   - Visit: `https://defendu-app.vercel.app/api/password-reset`
   - Should see 405 (not 404)

4. **Check Vercel Logs**
   - Dashboard → Deployments → Functions → Logs
   - Look for Mailjet errors

5. **Check Mailjet Dashboard**
   - Verify email delivery status
   - Check for bounces/errors

---

## ✅ Expected Flow

1. User enters email → Clicks "Send Reset Link"
2. App calls: `POST https://your-vercel-url/api/password-reset`
3. Vercel function:
   - Validates email
   - Generates reset token
   - Stores token in Realtime Database
   - Sends email via Mailjet
4. User receives email
5. User clicks link → Resets password

**If email not received:**
- Check steps 1-5 above
- Most likely: Vercel not deployed, or Mailjet credentials wrong

---

## 🚀 Quick Test

Try this to test if API is working:

```bash
# In terminal or Postman
curl -X POST https://defendu-app.vercel.app/api/password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"your-registered-email@example.com"}'
```

**If this works but app doesn't:**
- Check `EXPO_PUBLIC_API_BASE_URL` in `.env`
- Restart app

**If this doesn't work:**
- Check Vercel deployment
- Check environment variables
- Check Vercel function logs

---

## 📞 Need More Help?

Share:
1. Error message from terminal
2. Vercel function logs
3. Browser console errors (if web)
4. API response when testing directly

This will help identify the exact issue! 🔍
