// config/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBKq8u_QrSt5jontBA338Fk9PEjnD4pmdA",
  authDomain: "defendu-e7970.firebaseapp.com",
  projectId: "defendu-e7970",
  storageBucket: "defendu-e7970.firebasestorage.app",
  messagingSenderId: "256989481360",
  appId: "1:256989481360:web:458b011aa0089b3a940b15",
  measurementId: "G-613DQ6W3FX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;