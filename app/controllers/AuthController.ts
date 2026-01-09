// controllers/AuthController.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, db } from '../config/firebaseConfig';
import { User, RegisterData, LoginData, ForgotPasswordData } from '../models/User';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class AuthController {
  // Register new user
  static async register(data: RegisterData): Promise<User> {
    try {
      console.log('🔵 Starting registration for:', data.email);
      console.log('🔵 Auth object:', !!auth);
      console.log('🔵 Realtime Database object:', !!db);

      // Create user in Firebase Auth
      console.log('🔵 Creating user in Firebase Auth...');
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      const firebaseUser = userCredential.user;
      console.log('✅ User created in Auth with UID:', firebaseUser.uid);

      // Create user document in Realtime Database
      const userData: User = {
        uid: firebaseUser.uid,
        email: data.email,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        createdAt: new Date(),
      };

      console.log('🔵 Attempting to save to Realtime Database...');
      console.log('🔵 User data:', JSON.stringify(userData, null, 2));
      
      // Convert Date to timestamp for Realtime Database compatibility
      const userDataForDB = {
        ...userData,
        createdAt: userData.createdAt.getTime(), // Store as timestamp
      };
      
      await set(ref(db, `users/${firebaseUser.uid}`), userDataForDB);
      
      console.log('✅ Successfully saved to Realtime Database!');

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

      // Get user data from Realtime Database
      console.log('🔵 Fetching user data from Realtime Database...');
      const userSnapshot = await get(ref(db, `users/${firebaseUser.uid}`));

      if (!userSnapshot.exists()) {
        console.error('❌ User data not found in Realtime Database');
        throw new Error('User data not found');
      }

      const userDataRaw = userSnapshot.val();
      // Convert timestamp back to Date object
      const userData: User = {
        ...userDataRaw,
        createdAt: userDataRaw.createdAt ? new Date(userDataRaw.createdAt) : new Date(),
      };
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

  // Forgot password - Now uses backend API with Mailjet
  static async forgotPassword(data: ForgotPasswordData): Promise<string> {
    try {
      const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-api-domain.com';
      
      const response = await fetch(`${apiBaseUrl}/api/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send password reset email');
      }

      return result.message || 'Password reset email sent successfully';
    } catch (error: any) {
      console.error('❌ Forgot password error:', error);
      throw new Error(error.message || 'Failed to send password reset email');
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