// scripts/create-admin.js
// Script to create an admin account in Firebase
// Run with: node scripts/create-admin.js

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin SDK
function initializeAdmin() {
  // Check if already initialized
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Try to get service account from environment variable (for Vercel/production)
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
  
  if (serviceAccountKey) {
    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountKey, 'base64').toString('utf8')
    );
    
    const databaseURL = process.env.FIREBASE_DATABASE_URL || 
      'https://defendu-e7970-default-rtdb.asia-southeast1.firebasedatabase.app';

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: databaseURL,
    });
  }

  // For local development, try to use a service account file
  // You can download this from Firebase Console → Project Settings → Service Accounts
  try {
    const serviceAccount = require('../serviceAccountKey.json');
    const databaseURL = process.env.FIREBASE_DATABASE_URL || 
      'https://defendu-e7970-default-rtdb.asia-southeast1.firebasedatabase.app';

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: databaseURL,
    });
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:');
    console.error('Please set up Firebase Admin SDK credentials.');
    console.error('Options:');
    console.error('1. Set FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 environment variable');
    console.error('2. Place serviceAccountKey.json in the project root');
    console.error('3. Download service account from Firebase Console → Project Settings → Service Accounts');
    process.exit(1);
  }
}

async function createAdminAccount() {
  try {
    console.log('🔵 Initializing Firebase Admin SDK...');
    const app = initializeAdmin();
    const auth = admin.auth();
    const db = admin.database();

    // Admin account details
    const adminEmail = 'admin@defendu.com'; // Correct spelling
    const adminPassword = 'Admin123#';
    const firstName = 'DEFENDU';
    const lastName = 'ADMIN';
    const username = 'admin';

    console.log('🔵 Creating admin account...');
    console.log('📧 Email:', adminEmail);
    console.log('👤 Username:', username);
    console.log('👤 Name:', `${firstName} ${lastName}`);

    // Check if user already exists
    let user;
    try {
      user = await auth.getUserByEmail(adminEmail);
      console.log('⚠️  User with this email already exists. UID:', user.uid);
      console.log('🔵 Updating user data...');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // User doesn't exist, create it
        console.log('🔵 Creating new user in Firebase Auth...');
        user = await auth.createUser({
          email: adminEmail,
          password: adminPassword,
          displayName: `${firstName} ${lastName}`,
        });
        console.log('✅ User created in Firebase Auth. UID:', user.uid);
      } else {
        throw error;
      }
    }

    // Create/update user data in Realtime Database
    const userData = {
      uid: user.uid,
      email: adminEmail,
      username: username,
      firstName: firstName,
      lastName: lastName,
      createdAt: Date.now(),
      role: 'admin',
      hasCompletedSkillProfile: false,
      trainerApproved: true,
    };

    console.log('🔵 Saving user data to Realtime Database...');
    const userRef = db.ref(`users/${user.uid}`);
    await userRef.set(userData);
    console.log('✅ User data saved to Realtime Database');

    console.log('\n✅ Admin account created/updated successfully!');
    console.log('📋 Account Details:');
    console.log('   Email:', adminEmail);
    console.log('   Password:', adminPassword);
    console.log('   UID:', user.uid);
    console.log('   Role: admin');
    console.log('\n🔐 You can now log in with these credentials.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin account:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    process.exit(1);
  }
}

// Run the script
createAdminAccount();
