// controllers/AuthController.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { ref, set, get, update } from 'firebase/database';
import { auth, db } from '../config/firebaseConfig';
import { User, RegisterData, LoginData, ForgotPasswordData } from '../models/User';
import { SkillProfile } from '../models/SkillProfile';
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
        role: 'individual', // Default role
        hasCompletedSkillProfile: false, // Default to false
        trainerApproved: false, // Default to false
      };

      console.log('🔵 Attempting to save to Realtime Database...');
      console.log('🔵 User data:', JSON.stringify(userData, null, 2));
      
      // Convert Date to timestamp for Realtime Database compatibility
      const userDataForDB = {
        ...userData,
        createdAt: userData.createdAt.getTime(), // Store as timestamp
      };
      
      console.log('🔵 Database reference path:', `users/${firebaseUser.uid}`);
      console.log('🔵 Database URL:', process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL);
      
      try {
        await set(ref(db, `users/${firebaseUser.uid}`), userDataForDB);
        console.log('✅ Successfully saved to Realtime Database!');
      } catch (dbError: any) {
        console.error('❌ Database save error:', dbError);
        console.error('❌ Error code:', dbError.code);
        console.error('❌ Error message:', dbError.message);
        console.error('❌ Full error:', JSON.stringify(dbError, null, 2));
        throw dbError; // Re-throw to be caught by outer catch
      }

      // Save user to local storage
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      console.log('✅ Saved to AsyncStorage');

      return userData;
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      
      // Check if it's a database error
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
        console.error('⚠️ PERMISSION DENIED: Check database security rules in Firebase Console');
        console.error('⚠️ Go to: Firebase Console → Realtime Database → Rules');
        console.error('⚠️ Temporarily set rules to: { "rules": { ".read": true, ".write": true } }');
      }
      
      if (error.code === 'unavailable' || error.code === 'UNAVAILABLE') {
        console.error('⚠️ DATABASE UNAVAILABLE: Check database URL and internet connection');
        console.error('⚠️ Database URL:', process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL);
      }
      
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
      // Convert timestamp back to Date object and set defaults for new fields
      const userData: User = {
        ...userDataRaw,
        createdAt: userDataRaw.createdAt ? new Date(userDataRaw.createdAt) : new Date(),
        role: userDataRaw.role || 'individual', // Default to individual if not set
        hasCompletedSkillProfile: userDataRaw.hasCompletedSkillProfile || false, // Default to false
        trainerApproved: userDataRaw.trainerApproved || false, // Default to false
        // Skill profile fields (optional, so they can be undefined)
        height: userDataRaw.height,
        weight: userDataRaw.weight,
        age: userDataRaw.age,
        gender: userDataRaw.gender,
        physicalLimitations: userDataRaw.physicalLimitations,
        // Normalize arrays to ensure they're always arrays
        preferredTechnique: this.normalizeArray(userDataRaw.preferredTechnique),
        trainingGoal: this.normalizeArray(userDataRaw.trainingGoal),
        experienceLevel: userDataRaw.experienceLevel,
        martialArtsBackground: this.normalizeArray(userDataRaw.martialArtsBackground),
        previousTrainingDetails: userDataRaw.previousTrainingDetails,
        currentFitnessLevel: userDataRaw.currentFitnessLevel,
        trainingFrequency: userDataRaw.trainingFrequency,
        currentInjuries: userDataRaw.currentInjuries,
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
      
      console.log('🔵 Forgot password - API URL:', `${apiBaseUrl}/api/password-reset`);
      console.log('🔵 Forgot password - Email:', data.email);
      
      const response = await fetch(`${apiBaseUrl}/api/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      });

      console.log('🔵 API Response Status:', response.status);
      console.log('🔵 API Response OK:', response.ok);

      const result = await response.json();
      console.log('🔵 API Response Data:', JSON.stringify(result, null, 2));

      if (!response.ok) {
        console.error('❌ API Error Response:', JSON.stringify(result, null, 2));
        console.error('❌ API Error Message:', result.message);
        console.error('❌ API Error Details:', result.details);
        console.error('❌ API Status Code:', response.status);
        
        // Handle specific error codes
        if (response.status === 404 && result.code === 'USER_NOT_FOUND') {
          throw new Error('No account found with this email address. Please check your email or create an account.');
        }
        
        // Show more detailed error message
        let errorMsg = result.error || 'Failed to send password reset email';
        if (result.message) {
          errorMsg += `: ${result.message}`;
        }
        throw new Error(errorMsg);
      }

      console.log('✅ Password reset email sent successfully');
      return result.message || 'Password reset email sent successfully';
    } catch (error: any) {
      console.error('❌ Forgot password error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      // Check for network errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
        console.error('⚠️ NETWORK ERROR: Check if Vercel API is deployed and accessible');
        console.error('⚠️ API URL:', process.env.EXPO_PUBLIC_API_BASE_URL);
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      throw new Error(error.message || 'Failed to send password reset email');
    }
  }

  // Helper function to normalize arrays (Firebase sometimes returns arrays as objects)
  private static normalizeArray(value: any): string[] | undefined {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    // If it's an object with numeric keys, convert to array
    if (typeof value === 'object') {
      const keys = Object.keys(value).sort((a, b) => Number(a) - Number(b));
      if (keys.every(k => !isNaN(Number(k)))) {
        return keys.map(k => value[k]);
      }
    }
    return undefined;
  }

  // Get current user
  static async getCurrentUser(): Promise<User | null> {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (!userJson) {
        return null;
      }

      const userDataRaw = JSON.parse(userJson);
      
      // Convert Date string back to Date object and set defaults for new fields
      const userData: User = {
        ...userDataRaw,
        createdAt: userDataRaw.createdAt 
          ? (typeof userDataRaw.createdAt === 'string' 
              ? new Date(userDataRaw.createdAt) 
              : new Date(userDataRaw.createdAt))
          : new Date(),
        role: userDataRaw.role || 'individual', // Default to individual if not set
        hasCompletedSkillProfile: userDataRaw.hasCompletedSkillProfile ?? false, // Default to false
        trainerApproved: userDataRaw.trainerApproved ?? false, // Default to false
        // Skill profile fields (optional, so they can be undefined)
        height: userDataRaw.height,
        weight: userDataRaw.weight,
        age: userDataRaw.age,
        gender: userDataRaw.gender,
        physicalLimitations: userDataRaw.physicalLimitations,
        // Normalize arrays to ensure they're always arrays
        preferredTechnique: this.normalizeArray(userDataRaw.preferredTechnique),
        trainingGoal: this.normalizeArray(userDataRaw.trainingGoal),
        experienceLevel: userDataRaw.experienceLevel,
        martialArtsBackground: this.normalizeArray(userDataRaw.martialArtsBackground),
        previousTrainingDetails: userDataRaw.previousTrainingDetails,
        currentFitnessLevel: userDataRaw.currentFitnessLevel,
        trainingFrequency: userDataRaw.trainingFrequency,
        currentInjuries: userDataRaw.currentInjuries,
      };

      return userData;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  }

  // Save skill profile to database
  static async saveSkillProfile(profile: SkillProfile): Promise<void> {
    try {
      // Validate profile data
      if (!profile.physicalAttributes || !profile.preferences || !profile.pastExperience || !profile.fitnessCapabilities) {
        console.error('❌ Invalid profile data - missing required sections');
        throw new Error('Invalid profile data - missing required sections');
      }

      console.log('🔵 saveSkillProfile called');
      console.log('🔵 Profile data:', {
        uid: profile.uid,
        hasPhysicalAttributes: !!profile.physicalAttributes,
        hasPreferences: !!profile.preferences,
        hasPastExperience: !!profile.pastExperience,
        hasFitnessCapabilities: !!profile.fitnessCapabilities,
      });
      
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        console.error('❌ No current user found');
        throw new Error('User not authenticated');
      }

      console.log('✅ Current user found:', currentUser.uid);

      // Check if profile already exists
      const existingProfileSnapshot = await get(ref(db, `skillProfiles/${currentUser.uid}`));
      const isUpdate = existingProfileSnapshot.exists();
      console.log('🔵 Profile exists:', isUpdate);

      // Convert Date to timestamp for Realtime Database
      const profileForDB = {
        uid: profile.uid,
        physicalAttributes: {
          height: profile.physicalAttributes.height,
          weight: profile.physicalAttributes.weight,
          age: profile.physicalAttributes.age,
          gender: profile.physicalAttributes.gender,
          limitations: profile.physicalAttributes.limitations || null,
        },
        preferences: {
          preferredTechnique: profile.preferences.preferredTechnique || [],
          trainingGoal: profile.preferences.trainingGoal || [],
        },
        pastExperience: {
          experienceLevel: profile.pastExperience.experienceLevel,
          martialArtsBackground: profile.pastExperience.martialArtsBackground || [],
          previousTrainingDetails: profile.pastExperience.previousTrainingDetails || null,
        },
        fitnessCapabilities: {
          currentFitnessLevel: profile.fitnessCapabilities.currentFitnessLevel,
          trainingFrequency: profile.fitnessCapabilities.trainingFrequency,
          injuries: profile.fitnessCapabilities.injuries || null,
        },
        completedAt: isUpdate 
          ? existingProfileSnapshot.val().completedAt // Keep original completion date
          : profile.completedAt.getTime(),
        updatedAt: new Date().getTime(), // Always update the updatedAt timestamp
      };

      console.log('🔵 Saving complete skill profile to skillProfiles');
      console.log('🔵 Profile data structure:', {
        uid: profileForDB.uid,
        physicalAttributes: profileForDB.physicalAttributes,
        preferences: profileForDB.preferences,
        pastExperience: profileForDB.pastExperience,
        fitnessCapabilities: profileForDB.fitnessCapabilities,
      });

      // Save skill profile
      try {
        await set(ref(db, `skillProfiles/${currentUser.uid}`), profileForDB);
        console.log('✅ Skill profile saved to skillProfiles/' + currentUser.uid);
      } catch (profileError: any) {
        console.error('❌ Error saving skill profile:', profileError);
        console.error('❌ Error code:', profileError.code);
        console.error('❌ Error message:', profileError.message);
        throw profileError;
      }

      // Update user record with individual skill profile fields
      const userUpdates: any = {
        hasCompletedSkillProfile: true,
        // Physical Attributes
        height: profile.physicalAttributes.height,
        weight: profile.physicalAttributes.weight,
        age: profile.physicalAttributes.age,
        gender: profile.physicalAttributes.gender,
        physicalLimitations: profile.physicalAttributes.limitations || null,
        // Preferences (arrays - save as arrays, empty arrays stay as empty arrays)
        preferredTechnique: profile.preferences.preferredTechnique || [],
        trainingGoal: profile.preferences.trainingGoal || [],
        // Past Experience
        experienceLevel: profile.pastExperience.experienceLevel,
        martialArtsBackground: profile.pastExperience.martialArtsBackground || [],
        previousTrainingDetails: profile.pastExperience.previousTrainingDetails || null,
        // Fitness Capabilities
        currentFitnessLevel: profile.fitnessCapabilities.currentFitnessLevel,
        trainingFrequency: profile.fitnessCapabilities.trainingFrequency,
        currentInjuries: profile.fitnessCapabilities.injuries || null,
      };

      console.log('🔵 Saving skill profile data to user record:', JSON.stringify(userUpdates, null, 2));
      console.log('🔵 User UID:', currentUser.uid);
      console.log('🔵 Database path: users/' + currentUser.uid);

      try {
        await update(ref(db, `users/${currentUser.uid}`), userUpdates);
        console.log('✅ User record updated successfully in database');
      } catch (updateError: any) {
        console.error('❌ Error updating user record:', updateError);
        console.error('❌ Error code:', updateError.code);
        console.error('❌ Error message:', updateError.message);
        throw updateError;
      }

      // Update local storage with all the new fields
      const updatedUser: User = {
        ...currentUser,
        ...userUpdates,
      };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      console.log('✅ Local storage updated');

      console.log(`✅ Skill profile ${isUpdate ? 'updated' : 'saved'} successfully`);
      console.log('✅ All data saved to database and local storage');
    } catch (error: any) {
      console.error('❌ Error saving skill profile:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      // Check for database permission errors
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED' || error.message?.includes('Permission denied')) {
        console.error('⚠️ PERMISSION DENIED: Check database security rules');
        console.error('⚠️ Go to Firebase Console → Realtime Database → Rules');
        console.error('⚠️ Set rules to allow authenticated users to write to their own data');
        throw new Error('Database permission denied. Please check Firebase Console → Realtime Database → Rules. See FIREBASE_DATABASE_RULES.md for the correct rules.');
      }
      
      throw new Error(error.message || 'Failed to save skill profile');
    }
  }

  // Update user role (for admin approval)
  static async updateUserRole(uid: string, role: 'individual' | 'trainer' | 'admin', trainerApproved?: boolean): Promise<void> {
    try {
      const updates: any = { role };
      if (trainerApproved !== undefined) {
        updates.trainerApproved = trainerApproved;
      }

      await update(ref(db, `users/${uid}`), updates);
      console.log('✅ User role updated successfully');
    } catch (error: any) {
      console.error('❌ Error updating user role:', error);
      throw new Error('Failed to update user role');
    }
  }

  // Get skill profile for current user
  static async getSkillProfile(): Promise<SkillProfile | null> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        return null;
      }

      const profileSnapshot = await get(ref(db, `skillProfiles/${currentUser.uid}`));
      if (!profileSnapshot.exists()) {
        return null;
      }

      const profileData = profileSnapshot.val();
      return {
        ...profileData,
        completedAt: new Date(profileData.completedAt),
        updatedAt: profileData.updatedAt ? new Date(profileData.updatedAt) : undefined,
      };
    } catch (error: any) {
      console.error('❌ Error getting skill profile:', error);
      return null;
    }
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