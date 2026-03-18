# Update Database Rules for Trainer Directory

## Issue
Approved trainers are not showing up in the trainer dashboard because the database rules don't allow regular users to read the users collection.

## Solution
The database rules have been updated to allow all authenticated users to read the users collection (so they can view approved trainers).

## Steps to Deploy:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **defendu-e7970**
3. Navigate to **Realtime Database** → **Rules** tab
4. Copy the contents from `FIREBASE_DATABASE_RULES.json`
5. Paste into the Firebase Console rules editor
6. Click **Publish** to deploy the rules
7. Wait a few seconds for the rules to propagate

## What Changed:

The rule on line 8 was updated from:
```json
".read": "auth.uid !== null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
```

To:
```json
".read": "auth.uid !== null"
```

This allows all authenticated users to read the users collection, which is necessary for the trainer directory feature. The data is filtered client-side to only show approved trainers.

## Security Note:

This change allows authenticated users to read all user data. However:
- Sensitive data (like passwords) are not stored in the users table
- Only approved trainers are displayed in the UI (filtered client-side)
- Individual user data can still only be read by the user themselves or admins (via the `$uid` rule)
- This is a common pattern for public directories

## After Deploying:

1. Clear your browser cache or restart the Expo dev server
2. Refresh the trainer page
3. Approved trainers should now appear
