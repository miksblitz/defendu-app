// controllers/AuthController.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { User, RegisterData, LoginData, ForgotPasswordData } from '../models/User';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class AuthController {
  // Register new user
  static async register(data: RegisterData): Promise<User> {
    try {
      console.log('🔵 Starting registration for:', data.email);
      console.log('🔵 Auth object:', !!auth);
      console.log('🔵 Firestore object:', !!db);

      // Create user in Firebase Auth
      console.log('🔵 Creating user in Firebase Auth...');
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      const firebaseUser = userCredential.user;
      console.log('✅ User created in Auth with UID:', firebaseUser.uid);

      // Create user document in Firestore
      const userData: User = {
        uid: firebaseUser.uid,
        email: data.email,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        createdAt: new Date(),
      };

      console.log('🔵 Attempting to save to Firestore...');
      console.log('🔵 User data:', JSON.stringify(userData, null, 2));
      
      await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      
      console.log('✅ Successfully saved to Firestore!');

      // Save user to local storage
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      console.log('✅ Saved to AsyncStorage');

      return userData;
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  // Login user
  static async login(data: LoginData): Promise<User> {
    try {
      console.log('🔵 Starting login for:', data.email);
      
      const userCredential = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      const firebaseUser = userCredential.user;
      console.log('✅ User logged in with UID:', firebaseUser.uid);

      // Get user data from Firestore
      console.log('🔵 Fetching user data from Firestore...');
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (!userDoc.exists()) {
        console.error('❌ User document not found in Firestore');
        throw new Error('User data not found');
      }

      const userData = userDoc.data() as User;
      console.log('✅ User data retrieved:', userData);

      // Save user to local storage
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      return userData;
    } catch (error: any) {
      console.error('❌ Login error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  // Logout user
  static async logout(): Promise<void> {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem('user');
      console.log('✅ User logged out');
    } catch (error: any) {
      console.error('❌ Logout error:', error);
      throw new Error('Logout failed');
    }
  }

  // Forgot password
  static async forgotPassword(data: ForgotPasswordData): Promise<string> {
    try {
      await sendPasswordResetEmail(auth, data.email);
      return 'Password reset email sent successfully';
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<User | null> {
    try {
      const userJson = await AsyncStorage.getItem('user');
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      return null;
    }
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  }

  // Helper method to get user-friendly error messages
  private static getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'This email is already registered';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection';
      default:
        return 'An error occurred. Please try again';
    }
  }
}