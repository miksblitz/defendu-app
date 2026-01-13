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

- Check Firebase Realtime Database rules
- Ensure authenticated users can write to their own user data
- For admin operations, you may need to temporarily allow writes

### User already exists

- The script will update the existing user's role to admin
- If you want to reset the password, use Firebase Console → Authentication → Users → Reset Password
