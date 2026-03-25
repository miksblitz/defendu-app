// config/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Cloudinary Configuration
export const cloudinaryConfig = {
  cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? 'diii2xfo6',
  uploadPreset: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? 'defendu_uploads',
};

// Prefer environment variables so secrets aren’t hard-coded.
// In Expo, you can define these as EXPO_PUBLIC_* in a .env / .env.local file
// and access them via process.env at build time.
const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ??
    'AIzaSyBKq8u_QrSt5jontBA338Fk9PEjnD4pmdA',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    'defendu-e7970.firebaseapp.com',
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'defendu-e7970',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    'defendu-e7970.firebasestorage.app',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '256989481360',
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ??
    '1:256989481360:web:458b011aa0089b3a940b15',
  measurementId:
    process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? 'G-613DQ6W3FX',
  databaseURL:
    process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ??
    'https://defendu-e7970-default-rtdb.asia-southeast1.firebasedatabase.app',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getDatabase(app); // Realtime Database instead of Firestore

export default app;