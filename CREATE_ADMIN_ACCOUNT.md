# Creating Admin Account

This guide explains how to create the admin account for DEFENDU.

## Admin Account Details

- **Email:** admin@defendu.com
- **Password:** Admin123#
- **First Name:** DEFENDU
- **Last Name:** ADMIN
- **Username:** admin
- **Role:** admin

## Method 1: Using the Script (Recommended)

### Prerequisites

You need Firebase Admin SDK credentials. You can get them by:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `defendu-e7970`
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file as `serviceAccountKey.json` in the project root

### Run the Script

```bash
npm run create-admin
```

Or directly:

```bash
node scripts/create-admin.js
```

The script will:
- Create the user in Firebase Authentication
- Set the role to 'admin' in the Realtime Database
- Set trainerApproved to true

## Method 2: Manual Creation via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `defendu-e7970`
3. Go to **Authentication** → **Users**
4. Click **Add User**
5. Enter:
   - Email: `admin@defendu.com`
   - Password: `Admin123#`
6. Copy the User UID
7. Go to **Realtime Database** → **Data**
8. Navigate to `users/{UID}`
9. Set the following fields:
   - `email`: `admin@defendu.com`
   - `username`: `admin`
   - `firstName`: `DEFENDU`
   - `lastName`: `ADMIN`
   - `role`: `admin`
   - `trainerApproved`: `true`
   - `hasCompletedSkillProfile`: `false`
   - `createdAt`: (current timestamp)

## Method 3: Register Then Update Role

1. Register the account through the app's registration page
2. Note the User UID from Firebase Console
3. Update the role in Realtime Database as described in Method 2

## Verification

After creating the account, you can verify it by:

1. Logging in with the credentials in the app
2. Checking Firebase Console → Authentication → Users
3. Checking Firebase Console → Realtime Database → users → {UID}

## Troubleshooting

### Script fails with "Error initializing Firebase Admin"

- Make sure you have `serviceAccountKey.json` in the project root, OR
- Set the `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` environment variable

### Permission Denied errors

If you're getting "Permission denied" errors when trying to fetch all users or perform admin operations, you need to configure Firebase Realtime Database security rules.

#### Required Firebase Realtime Database Security Rules

Go to [Firebase Console](https://console.firebase.google.com/) → Your Project → **Realtime Database** → **Rules** and set the following rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid || (auth.uid !== null && root.child('users').child(auth.uid).child('role').val() === 'admin')",
        ".write": "$uid === auth.uid || (auth.uid !== null && root.child('users').child(auth.uid).child('role').val() === 'admin')"
      },
      ".read": "auth.uid !== null && root.child('users').child(auth.uid).child('role').val() === 'admin'",
      ".write": "auth.uid !== null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
    }
  }
}
```

**What these rules do:**
- Users can read/write their own user data (`users/{uid}`)
- Admins can read/write all user data (entire `users/` path)
- Only authenticated users with `role === 'admin'` can access the full users list

**Important:** Make sure:
1. The admin user is logged in via Firebase Authentication
2. The admin user has `role: 'admin'` in the database at `users/{adminUID}/role`
3. The security rules are published (click "Publish" after editing)

### User already exists

- The script will update the existing user's role to admin
- If you want to reset the password, use Firebase Console → Authentication → Users → Reset Password
