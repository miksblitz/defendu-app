# ✅ Custom Token System for Password Reset

## 🎯 What Changed

**Removed Firebase OOB (Out-of-Band) Codes** and replaced with **custom secure tokens**.

---

## ✅ New Implementation

### 1. **Custom Token Generation** (`api/password-reset.ts`)
- ✅ Generates cryptographically secure random token (64 hex characters)
- ✅ Stores token in Realtime Database with 5-minute expiry
- ✅ Sends email via Mailjet with custom token link
- ✅ **NO Firebase OOB codes** - completely custom system

### 2. **Token Validation** (`api/validate-reset-token.ts`)
- ✅ Validates custom token via webhook/API
- ✅ Checks 5-minute expiry
- ✅ Verifies token hasn't been used
- ✅ Returns token metadata (email, expiry, etc.)

### 3. **Password Reset** (`api/confirm-password-reset.ts`)
- ✅ Uses Firebase Admin SDK to change password directly
- ✅ Validates custom token before resetting
- ✅ Marks token as used after successful reset
- ✅ **Uses Firebase Auth via Admin SDK** (not OOB codes)

### 4. **App Integration** (`app/(auth)/resetpassword.tsx`)
- ✅ Updated to use `token` parameter instead of `oobCode`
- ✅ Validates token via webhook before allowing password change
- ✅ Uses custom token system end-to-end

---

## 🔐 Security Features

1. **Cryptographically Secure Tokens**
   - Uses Node.js `crypto.randomBytes(32)` 
   - 64-character hex string (256 bits of entropy)
   - Virtually impossible to guess

2. **5-Minute Expiry**
   - Tokens expire after 5 minutes
   - Stored in Realtime Database with `expiresAt` timestamp
   - Automatic cleanup of expired tokens

3. **One-Time Use**
   - Tokens marked as `used: true` after password reset
   - Prevents token reuse attacks

4. **Token Validation**
   - Webhook validates token before password change
   - Checks expiry, usage status, and existence

---

## 📋 Flow

1. **User requests password reset:**
   - POST `/api/password-reset` with email
   - System generates custom secure token
   - Token stored in Realtime Database (5-min expiry)
   - Email sent via Mailjet with token link

2. **User clicks email link:**
   - Opens redirect page: `/api/reset-redirect?token=...`
   - Redirect page opens app with deep link
   - App navigates to `resetpassword.tsx` with token

3. **App validates token:**
   - POST `/api/validate-reset-token` with token
   - Webhook checks token validity, expiry, usage
   - Returns token metadata if valid

4. **User changes password:**
   - User enters new password in `resetpassword.tsx`
   - POST `/api/confirm-password-reset` with token + newPassword
   - Backend validates token again
   - Firebase Admin SDK updates password: `auth.updateUser(uid, { password })`
   - Token marked as used

---

## 🔧 Technical Details

### Token Format
```
64-character hex string
Example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### Database Structure
```json
{
  "passwordResetTokens": {
    "a1b2c3d4...": {
      "email": "user@example.com",
      "userId": "firebase-uid",
      "createdAt": 1234567890000,
      "expiresAt": 1234567893000,
      "used": false
    }
  }
}
```

### API Endpoints

1. **POST `/api/password-reset`**
   - Input: `{ email: string }`
   - Output: `{ success: true, message: string }`
   - Generates token, stores in DB, sends email

2. **POST `/api/validate-reset-token`**
   - Input: `{ token: string }`
   - Output: `{ valid: boolean, email?: string, expiresAt?: number }`
   - Validates token via webhook

3. **POST `/api/confirm-password-reset`**
   - Input: `{ token: string, newPassword: string }`
   - Output: `{ success: true, message: string }`
   - Changes password via Firebase Admin SDK

---

## ✅ Benefits

1. **Full Control**
   - No dependency on Firebase OOB codes
   - Custom expiry (exactly 5 minutes)
   - Custom validation logic

2. **Better Security**
   - Cryptographically secure tokens
   - One-time use enforcement
   - Automatic expiry cleanup

3. **Flexibility**
   - Easy to customize expiry time
   - Can add additional validation rules
   - Full control over email content

4. **Firebase Auth Integration**
   - Still uses Firebase Auth for password changes
   - Uses Admin SDK: `auth.updateUser(uid, { password })`
   - Maintains Firebase Auth security

---

## 🚀 Next Steps

1. **Commit and Push:**
   ```bash
   git add .
   git commit -m "Replace Firebase OOB codes with custom token system"
   git push
   ```

2. **Deploy to Vercel:**
   - Automatic deployment after push
   - Wait 1-2 minutes

3. **Test:**
   - Request password reset
   - Check email for token link
   - Click link → app opens
   - Validate token → change password
   - Verify password change works

---

## 📝 Summary

- ✅ **Removed:** Firebase OOB codes
- ✅ **Added:** Custom secure token system
- ✅ **Kept:** Firebase Auth for password changes (via Admin SDK)
- ✅ **Kept:** Mailjet for email delivery
- ✅ **Kept:** Webhook validation for tokens
- ✅ **Kept:** 5-minute token expiry

**The system now uses custom tokens instead of Firebase OOB codes!** 🎉
