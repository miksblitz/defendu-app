# Firebase Realtime Database Security Rules

## Required Rules for Registration and Skill Profile Feature

Copy and paste these rules into your Firebase Console:
**Firebase Console → Realtime Database → Rules**

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && $uid === auth.uid",
        ".write": "auth != null && $uid === auth.uid"
      }
    },
    "skillProfiles": {
      "$uid": {
        ".read": "auth != null && $uid === auth.uid",
        ".write": "auth != null && $uid === auth.uid"
      }
    }
  }
}
```

## What These Rules Do:

1. **`users/$uid`**: 
   - `.read`: Authenticated users can only read their own user data
   - `.write`: Authenticated users can only write to their own user data (including during registration when creating a new record)

2. **`skillProfiles/$uid`**: 
   - `.read`: Authenticated users can only read their own skill profile
   - `.write`: Authenticated users can only write to their own skill profile

## Steps to Apply:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`defendu-e7970`)
3. Click on **Realtime Database** in the left sidebar
4. Click on the **Rules** tab
5. Replace the existing rules with the rules above
6. Click **Publish**
7. Wait a few seconds for the rules to propagate

## Troubleshooting:

If you're still getting permission errors:

1. **Check that you're authenticated**: After `createUserWithEmailAndPassword`, the user should be authenticated. Check the browser console logs to see if authentication succeeded.

2. **Verify the UID matches**: The rules check that `$uid === auth.uid`. Make sure the path `users/{uid}` matches the authenticated user's UID.

3. **Try these temporary rules for testing** (NOT for production):

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

This allows any authenticated user to read/write all data. Use only for testing to confirm the issue is with the rules, then switch back to the secure rules above.

## Common Issues:

- **"Permission denied" during registration**: Make sure the user is authenticated after `createUserWithEmailAndPassword` before trying to write to the database. The code should already handle this correctly.

- **Rules not updating**: After publishing rules, wait 10-30 seconds for them to propagate across Firebase servers.

- **Still not working**: Check the browser console for the exact error message and error code. The registration code logs detailed error information.
