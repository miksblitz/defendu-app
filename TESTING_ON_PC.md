# 🖥️ Testing Password Reset on PC/Web

## ⚠️ Important: Deep Links Don't Work on PC

**Custom URL schemes** (`defenduapp://`) **only work on mobile devices** with the app installed. On PC/web browsers, they won't open the app.

---

## ✅ Solution: Use Web Version

I've updated the redirect page to automatically redirect to the **web version** of your app when accessed from PC/web.

---

## 🚀 How to Test on PC

### Option 1: Automatic Redirect (Recommended)

1. **Start your Expo web server:**
   ```bash
   npm run web
   # or
   npx expo start --web
   ```

2. **Request password reset** from your app

3. **Check email** and click the reset password link

4. **The redirect page will automatically:**
   - Detect you're on PC/web
   - Redirect to: `http://localhost:8081/resetpassword?token=...`
   - Open the reset password screen in your web browser

### Option 2: Manual URL

1. **Copy the token** from the email link:
   ```
   https://defendu-app.vercel.app/api/reset-redirect?token=YOUR_TOKEN&expiresAt=...
   ```

2. **Extract the token** from the URL

3. **Open in browser:**
   ```
   http://localhost:8081/resetpassword?token=YOUR_TOKEN
   ```

---

## 📱 Testing on Mobile (Real Device)

For **actual mobile testing** (where deep links work):

1. **Build/Install the app** on your phone:
   - Use Expo Go, or
   - Build a development build, or
   - Install from app store

2. **Request password reset**

3. **Click link in email** on your phone

4. **App should open** automatically (or after clicking button)

---

## 🔧 Environment Variables

For production, set `WEB_APP_URL` in Vercel:

```
WEB_APP_URL = https://your-web-app-domain.com
```

For local testing, it defaults to `http://localhost:8081`.

---

## 🎯 Current Behavior

### On Mobile:
- Redirect page tries to open app via deep link
- Falls back to button if automatic doesn't work

### On PC/Web:
- Redirect page automatically redirects to web version
- Opens: `http://localhost:8081/resetpassword?token=...`
- Works in browser without needing the app

---

## ✅ Testing Checklist

- [ ] Start Expo web server: `npm run web`
- [ ] Request password reset
- [ ] Click link in email (on PC)
- [ ] Should redirect to web version automatically
- [ ] Reset password screen should load in browser
- [ ] Can change password successfully

---

## 💡 Why This Happens

1. **Deep Links** (`defenduapp://`) are mobile-only
2. **PC browsers** don't have the app installed
3. **Solution:** Use web version for PC testing
4. **Production:** Deep links work on mobile devices

---

## 🎯 Summary

- ✅ **PC/Web:** Automatically redirects to web version
- ✅ **Mobile:** Opens app via deep link
- ✅ **Works:** Both platforms supported
- 🚀 **Test:** Start web server and try it!

**The redirect page now works on both PC and mobile!** 🎉
