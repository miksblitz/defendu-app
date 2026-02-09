# Deploy Firebase Database Rules

The database rules have been updated to include the `TrainerApplication` table. You need to deploy these rules to Firebase.

## Steps to Deploy:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **defendu-e7970**
3. Navigate to **Realtime Database** → **Rules** tab
4. Copy the contents from `FIREBASE_DATABASE_RULES.json`
5. Paste into the Firebase Console rules editor
6. Click **Publish** to deploy the rules

## What the Rules Do:

- **Users**: Can read/write their own data, admins can read/write all users
- **skillProfiles**: Users can read/write their own profile, admins can read/write all profiles
- **userProgress**: Each user can read/write their own completed modules at `userProgress/{uid}` (used for recommendations and "every 5 modules" refresh).
- **recommendations**: Each user can read their own at `recommendations/{uid}`; only admins can write (ML export script uploads here).
- **TrainerApplication**: 
  - Users can read/write their own application (at `TrainerApplication/{their_uid}`)
  - Admins can read/write all trainer applications

## Important:

After updating the rules, wait a few seconds for them to propagate before testing the application submission.
