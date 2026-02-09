// controllers/AuthController.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { ref, set, get, update, remove, onValue, off } from 'firebase/database';
import { auth, db, cloudinaryConfig } from '../config/firebaseConfig';
import { User, RegisterData, LoginData, ForgotPasswordData } from '../_models/User';
import { SkillProfile } from '../_models/SkillProfile';
import { TrainerApplication } from '../_models/TrainerApplication';
import { Module } from '../_models/Module';
import { ModuleReview } from '../_models/ModuleReview';
import { MessageController } from './MessageController';
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
      
      // Log role for debugging
      console.log('🔵 User role from database:', userDataRaw.role);
      console.log('🔵 User email:', userDataRaw.email);
      
      // Check if user is blocked
      if (userDataRaw.blocked === true) {
        console.error('❌ User account is blocked');
        await signOut(auth); // Sign out the user immediately
        throw new Error('This account has been blocked. Please contact support for details.');
      }
      
      // Update lastActive timestamp
      const now = new Date().getTime();
      await update(ref(db, `users/${firebaseUser.uid}`), { lastActive: now });
      
      // Convert timestamp back to Date object and set defaults for new fields
      // Ensure role is properly set - check for 'admin' explicitly
      const userRole = userDataRaw.role === 'admin' ? 'admin' : (userDataRaw.role || 'individual');
      console.log('🔵 Final user role:', userRole);
      
      const userData: User = {
        ...userDataRaw,
        createdAt: userDataRaw.createdAt ? new Date(userDataRaw.createdAt) : new Date(),
        lastActive: new Date(now), // Use the newly updated timestamp
        role: userRole, // Use the properly checked role
        hasCompletedSkillProfile: userDataRaw.hasCompletedSkillProfile || false, // Default to false
        trainerApproved: userDataRaw.trainerApproved || false, // Default to false
        blocked: userDataRaw.blocked || false, // Default to false
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
      // Clear all user data from AsyncStorage
      await AsyncStorage.removeItem('user');
      // Clear all AsyncStorage data to ensure complete session clear
      await AsyncStorage.clear();
      
      // Clear web storage if on web platform
      if (typeof window !== 'undefined') {
        // Clear localStorage
        window.localStorage.clear();
        // Clear sessionStorage
        window.sessionStorage.clear();
        // Clear cookies
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      }
      
      console.log('✅ User logged out and session cleared');
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
        lastActive: userDataRaw.lastActive 
          ? (typeof userDataRaw.lastActive === 'string' 
              ? new Date(userDataRaw.lastActive) 
              : new Date(userDataRaw.lastActive))
          : undefined,
        role: userDataRaw.role || 'individual', // Default to individual if not set
        hasCompletedSkillProfile: userDataRaw.hasCompletedSkillProfile ?? false, // Default to false
        trainerApproved: userDataRaw.trainerApproved ?? false, // Default to false
        blocked: userDataRaw.blocked ?? false, // Default to false
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

  /** Get a user by UID (for viewing profiles). Returns null if not found or permission denied. */
  static async getUserByUid(uid: string): Promise<User | null> {
    try {
      const userRef = ref(db, `users/${uid}`);
      const userSnapshot = await get(userRef);
      if (!userSnapshot.exists()) return null;
      const userDataRaw = userSnapshot.val();
      if (!userDataRaw || typeof userDataRaw !== 'object') return null;
      const user: User = {
        ...userDataRaw,
        uid,
        createdAt: userDataRaw.createdAt ? new Date(userDataRaw.createdAt) : new Date(),
        lastActive: userDataRaw.lastActive ? new Date(userDataRaw.lastActive) : undefined,
        role: (userDataRaw.role as User['role']) || 'individual',
        hasCompletedSkillProfile: userDataRaw.hasCompletedSkillProfile ?? false,
        trainerApproved: userDataRaw.trainerApproved ?? false,
        blocked: userDataRaw.blocked ?? false,
        preferredTechnique: this.normalizeArray(userDataRaw.preferredTechnique),
        trainingGoal: this.normalizeArray(userDataRaw.trainingGoal),
        martialArtsBackground: this.normalizeArray(userDataRaw.martialArtsBackground),
      };
      return user;
    } catch (error: any) {
      if (error?.code === 'PERMISSION_DENIED' || error?.message?.includes('Permission denied')) return null;
      console.error('Error getting user by uid:', error);
      return null;
    }
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  }

  // Wait for Firebase Auth to be ready and return current user
  static async waitForAuth(): Promise<typeof auth.currentUser> {
    return new Promise((resolve) => {
      // If auth is already ready, return immediately
      if (auth.currentUser) {
        resolve(auth.currentUser);
        return;
      }

      // Otherwise, wait for auth state change
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe(); // Unsubscribe after first change
        resolve(user);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        unsubscribe();
        resolve(auth.currentUser);
      }, 5000);
    });
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

  // Create admin account (one-time setup - requires admin privileges)
  static async createAdminAccount(data: RegisterData): Promise<User> {
    try {
      // First register the user normally
      const user = await this.register(data);
      
      // Then update the role to admin
      await this.updateUserRole(user.uid, 'admin', true);
      
      // Update local user data
      const adminUser: User = {
        ...user,
        role: 'admin',
        trainerApproved: true,
      };
      
      await AsyncStorage.setItem('user', JSON.stringify(adminUser));
      
      console.log('✅ Admin account created successfully');
      return adminUser;
    } catch (error: any) {
      console.error('❌ Error creating admin account:', error);
      throw new Error(error.message || 'Failed to create admin account');
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

  // Update username
  static async updateUsername(newUsername: string): Promise<void> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Remove @ if present (we'll add it back in the UI)
      const cleanUsername = newUsername.startsWith('@') ? newUsername.substring(1) : newUsername;
      
      // Validate username
      if (!cleanUsername || cleanUsername.trim().length === 0) {
        throw new Error('Username cannot be empty');
      }
      if (cleanUsername.length > 50) {
        throw new Error('Username is too long (max 50 characters)');
      }

      console.log('🔵 Updating username for user:', currentUser.uid);
      console.log('🔵 New username:', cleanUsername);

      // Update username in database
      await update(ref(db, `users/${currentUser.uid}`), { username: cleanUsername });
      console.log('✅ Username updated successfully in database');

      // Update local storage
      const updatedUser: User = {
        ...currentUser,
        username: cleanUsername,
      };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      console.log('✅ Local storage updated');
    } catch (error: any) {
      console.error('❌ Error updating username:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      
      // Check for database permission errors
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED' || error.message?.includes('Permission denied')) {
        console.error('⚠️ PERMISSION DENIED: Check database security rules');
        throw new Error('Database permission denied. Please check Firebase Console → Realtime Database → Rules.');
      }
      
      throw new Error(error.message || 'Failed to update username');
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

  /** ML recommendations: similar users + recommended module IDs. Data from recommendations/{uid} (export_recommendations.py + upload). */
  static async getRecommendations(): Promise<{
    similarUserIds: string[];
    recommendedModuleIds: string[];
  } | null> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) return null;
      const snap = await get(ref(db, `recommendations/${currentUser.uid}`));
      if (!snap.exists()) return { similarUserIds: [], recommendedModuleIds: [] };
      const data = snap.val();
      const similarUserIds = Array.isArray(data?.similarUserIds) ? data.similarUserIds : [];
      const recommendedModuleIds = Array.isArray(data?.recommendedModuleIds) ? data.recommendedModuleIds : [];
      return { similarUserIds, recommendedModuleIds };
    } catch (error: any) {
      console.error('❌ Error getting recommendations:', error);
      return null;
    }
  }

  /** User progress: completed modules. Used for "Recommended for you" and refresh every 5 completions. */
  static async getUserProgress(): Promise<{ completedModuleIds: string[]; completedCount: number }> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) return { completedModuleIds: [], completedCount: 0 };
      const snap = await get(ref(db, `userProgress/${currentUser.uid}`));
      if (!snap.exists()) return { completedModuleIds: [], completedCount: 0 };
      const data = snap.val();
      const completedModuleIds = Array.isArray(data?.completedModuleIds) ? data.completedModuleIds : [];
      const completedCount = typeof data?.completedCount === 'number' ? data.completedCount : completedModuleIds.length;
      return { completedModuleIds, completedCount };
    } catch (error: any) {
      console.error('❌ Error getting user progress:', error);
      return { completedModuleIds: [], completedCount: 0 };
    }
  }

  /** Record that the user completed a module. Call when they tap "Save Progress" on the complete step. Returns new completedCount (for "every 5" refresh). */
  static async recordModuleCompletion(moduleId: string): Promise<number> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');
    const existing = await this.getUserProgress();
    if (existing.completedModuleIds.includes(moduleId)) return existing.completedCount;
    const completedModuleIds = [...existing.completedModuleIds, moduleId];
    const completedCount = completedModuleIds.length;
    await set(ref(db, `userProgress/${currentUser.uid}`), {
      completedModuleIds,
      completedCount,
      updatedAt: Date.now(),
    });
    return completedCount;
  }

  /** Fetch approved modules by IDs (for recommended list). Returns only existing, approved modules. */
  static async getModulesByIds(moduleIds: string[]): Promise<Module[]> {
    if (!moduleIds.length) return [];
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) return [];
      const modules: Module[] = [];
      for (const moduleId of moduleIds) {
        const m = await this.getModuleByIdForUser(moduleId);
        if (m) modules.push(m);
      }
      return modules;
    } catch (error: any) {
      console.error('❌ Error getModulesByIds:', error);
      return [];
    }
  }

  // Update profile picture
  static async updateProfilePicture(imageUri: string): Promise<string> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      console.log('🔵 Starting profile picture upload for user:', currentUser.uid);
      console.log('🔵 Image URI:', imageUri);

      // Fetch the image as a blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      console.log('✅ Image fetched as blob, size:', blob.size);

      // Create FormData for Cloudinary upload
      const formData = new FormData();
      formData.append('file', blob as any);
      formData.append('upload_preset', cloudinaryConfig.uploadPreset);
      formData.append('public_id', `user_${currentUser.uid}_${Date.now()}`);
      
      // Upload to Cloudinary
      console.log('🔵 Uploading image to Cloudinary...');
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;
      
      const uploadResponse = await fetch(cloudinaryUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        console.error('❌ Cloudinary upload error:', errorData);
        throw new Error(errorData.error?.message || 'Failed to upload to Cloudinary');
      }

      const uploadResult = await uploadResponse.json();
      console.log('✅ Image uploaded to Cloudinary:', uploadResult.secure_url);

      const downloadURL = uploadResult.secure_url;

      // Update the user's profile picture URL in the database
      await update(ref(db, `users/${currentUser.uid}`), { profilePicture: downloadURL });
      console.log('✅ Profile picture URL updated in database');

      // Update local storage
      const updatedUser: User = {
        ...currentUser,
        profilePicture: downloadURL,
      };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      console.log('✅ Local storage updated');

      return downloadURL;
    } catch (error: any) {
      console.error('❌ Error updating profile picture:', error);
      console.error('❌ Error message:', error.message);
      
      // Check for Cloudinary-specific errors
      if (error.message.includes('upload_preset')) {
        console.error('⚠️ CLOUDINARY UPLOAD PRESET ERROR: You need to create an unsigned upload preset in Cloudinary Dashboard');
        throw new Error('Cloudinary upload preset not configured. Please check Cloudinary settings.');
      }
      
      throw new Error(error.message || 'Failed to update profile picture');
    }
  }

  // Get all users (admin only)
  static async getAllUsers(): Promise<User[]> {
    try {
      // First, verify the user is authenticated via Firebase Auth
      // Wait for auth to be ready in case it's still initializing
      let currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('🔵 Auth not ready, waiting for auth state...');
        currentUser = await this.waitForAuth();
      }

      if (!currentUser) {
        console.error('❌ User not authenticated via Firebase Auth');
        console.error('❌ Please make sure you are logged in');
        throw new Error('Permission denied. User must be authenticated. Please log in again.');
      }

      console.log('🔵 Current authenticated user UID:', currentUser.uid);

      // Verify the user is an admin by checking their role in the database
      const currentUserRef = ref(db, `users/${currentUser.uid}`);
      const currentUserSnapshot = await get(currentUserRef);
      
      if (!currentUserSnapshot.exists()) {
        console.error('❌ Current user data not found in database');
        throw new Error('Permission denied. User data not found.');
      }

      const currentUserData = currentUserSnapshot.val();
      const userRole = currentUserData?.role || 'individual';
      
      console.log('🔵 Current user role:', userRole);

      if (userRole !== 'admin') {
        console.error('❌ User is not an admin. Role:', userRole);
        throw new Error('Permission denied. Admin access required.');
      }

      console.log('✅ Admin verification passed. Fetching all users from database...');
      console.log('🔵 Database reference: users/');
      console.log('🔵 Database URL:', process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL);
      
      const usersRef = ref(db, 'users');
      const usersSnapshot = await get(usersRef);
      
      console.log('🔵 Snapshot exists:', usersSnapshot.exists());
      console.log('🔵 Snapshot value:', usersSnapshot.val());
      
      if (!usersSnapshot.exists()) {
        console.log('⚠️ No users found in database at path: users/');
        console.log('⚠️ This might be a permissions issue or the database is empty');
        return [];
      }

      const usersData = usersSnapshot.val();
      console.log('🔵 Users data keys:', Object.keys(usersData || {}));
      
      const users: User[] = [];

      // Convert each user object to User type
      for (const uid in usersData) {
        if (!usersData.hasOwnProperty(uid)) continue;
        
        const userDataRaw = usersData[uid];
        
        // Skip if userDataRaw is null or not an object
        if (!userDataRaw || typeof userDataRaw !== 'object') {
          console.warn(`⚠️ Skipping invalid user data for UID: ${uid}`);
          continue;
        }
        
        try {
          const user: User = {
            ...userDataRaw,
            uid,
            createdAt: userDataRaw.createdAt ? new Date(userDataRaw.createdAt) : new Date(),
            lastActive: userDataRaw.lastActive ? new Date(userDataRaw.lastActive) : undefined,
            role: userDataRaw.role || 'individual',
            hasCompletedSkillProfile: userDataRaw.hasCompletedSkillProfile || false,
            trainerApproved: userDataRaw.trainerApproved || false,
            blocked: userDataRaw.blocked || false,
            // Normalize arrays
            preferredTechnique: this.normalizeArray(userDataRaw.preferredTechnique),
            trainingGoal: this.normalizeArray(userDataRaw.trainingGoal),
            martialArtsBackground: this.normalizeArray(userDataRaw.martialArtsBackground),
          };
          users.push(user);
        } catch (userError) {
          console.error(`❌ Error processing user ${uid}:`, userError);
          // Continue with other users
        }
      }

      // Sort by createdAt (newest first)
      users.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      console.log(`✅ Retrieved ${users.length} users from database`);
      return users;
    } catch (error: any) {
      console.error('❌ Error fetching all users:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      // Check for permission errors
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED' || error.message?.includes('Permission denied')) {
        console.error('⚠️ PERMISSION DENIED: Admin may not have read access to all users');
        console.error('⚠️ Make sure:');
        console.error('   1. User is logged in via Firebase Auth');
        console.error('   2. User has role="admin" in the database at users/{uid}/role');
        console.error('   3. Firebase Realtime Database rules allow admins to read users/');
        console.error('⚠️ See CREATE_ADMIN_ACCOUNT.md for required security rules');
        throw new Error('Permission denied. Please check database security rules. See CREATE_ADMIN_ACCOUNT.md for setup instructions. Admin needs read access to users/ path.');
      }
      
      throw new Error(error.message || 'Failed to fetch users');
    }
  }

  // Get pending trainer applications (admin only)
  static async getPendingTrainerApplications(): Promise<User[]> {
    try {
      const allUsers = await this.getAllUsers();
      // Filter for trainers that are not yet approved
      const pendingTrainers = allUsers.filter(
        (user) => user.role === 'trainer' && user.trainerApproved !== true
      );
      console.log(`✅ Retrieved ${pendingTrainers.length} pending trainer applications`);
      return pendingTrainers;
    } catch (error: any) {
      console.error('❌ Error fetching pending trainer applications:', error);
      throw new Error(error.message || 'Failed to fetch trainer applications');
    }
  }

  // Approve trainer application (admin only)
  static async approveTrainerApplication(uid: string): Promise<void> {
    try {
      console.log('🔵 Approving trainer application:', uid);
      await update(ref(db, `users/${uid}`), { trainerApproved: true });
      console.log('✅ Trainer application approved successfully');
    } catch (error: any) {
      console.error('❌ Error approving trainer application:', error);
      throw new Error('Failed to approve trainer application');
    }
  }

  // Reject trainer application (admin only)
  static async rejectTrainerApplication(uid: string, rejectionReason?: string): Promise<void> {
    try {
      console.log('🔵 Rejecting trainer application:', uid);
      console.log('🔵 Rejection reason:', rejectionReason);
      
      // Delete TrainerApplication data from database
      const applicationRef = ref(db, `TrainerApplication/${uid}`);
      await remove(applicationRef);
      console.log('✅ TrainerApplication data deleted');
      
      // Update user role and approval status
      const userUpdates: any = {
        trainerApproved: false,
        role: 'individual', // Revert role back to individual
      };
      
      // Store rejection reason if provided (for future messaging feature)
      if (rejectionReason) {
        userUpdates.trainerRejectionReason = rejectionReason;
        userUpdates.trainerRejectedAt = new Date().getTime();
      }
      
      await update(ref(db, `users/${uid}`), userUpdates);
      console.log('✅ Trainer application rejected successfully');
    } catch (error: any) {
      console.error('❌ Error rejecting trainer application:', error);
      throw new Error('Failed to reject trainer application');
    }
  }

  // Get approved trainers (accessible to all authenticated users)
  static async getApprovedTrainers(): Promise<User[]> {
    try {
      // Verify the user is authenticated
      let currentUser = auth.currentUser;
      if (!currentUser) {
        currentUser = await this.waitForAuth();
      }

      if (!currentUser) {
        throw new Error('User must be authenticated to view trainers');
      }

      console.log('🔵 Fetching approved trainers...');
      
      // Query users table directly - this should be allowed for all authenticated users
      // to view approved trainers (based on database rules)
      const usersRef = ref(db, 'users');
      const usersSnapshot = await get(usersRef);
      
      if (!usersSnapshot.exists()) {
        console.log('⚠️ No users found in database');
        return [];
      }

      const usersData = usersSnapshot.val();
      const approvedTrainers: User[] = [];

      // Filter for approved trainers
      for (const uid in usersData) {
        if (!usersData.hasOwnProperty(uid)) continue;
        
        const userDataRaw = usersData[uid];
        if (!userDataRaw || typeof userDataRaw !== 'object') continue;
        
        // Only include approved trainers
        if (userDataRaw.role === 'trainer' && userDataRaw.trainerApproved === true) {
          try {
            const user: User = {
              ...userDataRaw,
              uid,
              createdAt: userDataRaw.createdAt ? new Date(userDataRaw.createdAt) : new Date(),
              lastActive: userDataRaw.lastActive ? new Date(userDataRaw.lastActive) : undefined,
              role: userDataRaw.role || 'individual',
              hasCompletedSkillProfile: userDataRaw.hasCompletedSkillProfile || false,
              trainerApproved: userDataRaw.trainerApproved || false,
              blocked: userDataRaw.blocked || false,
              // Normalize arrays
              preferredTechnique: this.normalizeArray(userDataRaw.preferredTechnique),
              trainingGoal: this.normalizeArray(userDataRaw.trainingGoal),
              martialArtsBackground: this.normalizeArray(userDataRaw.martialArtsBackground),
            };
            approvedTrainers.push(user);
          } catch (userError) {
            console.error(`❌ Error processing trainer ${uid}:`, userError);
            // Continue with other trainers
          }
        }
      }

      // Sort by createdAt (newest first)
      approvedTrainers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      console.log(`✅ Retrieved ${approvedTrainers.length} approved trainers`);
      return approvedTrainers;
    } catch (error: any) {
      console.error('❌ Error fetching approved trainers:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      
      // Check for permission errors
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED' || error.message?.includes('Permission denied')) {
        console.error('⚠️ PERMISSION DENIED: Check database security rules');
        console.error('⚠️ Users should be able to read approved trainers');
        throw new Error('Permission denied. Please check database security rules.');
      }
      
      throw new Error(error.message || 'Failed to fetch approved trainers');
    }
  }

  // Get trainer application data for a specific trainer
  static async getTrainerApplicationData(uid: string): Promise<TrainerApplication | null> {
    try {
      const applicationRef = ref(db, `TrainerApplication/${uid}`);
      const applicationSnapshot = await get(applicationRef);
      
      if (!applicationSnapshot.exists()) {
        return null;
      }
      
      const applicationData = applicationSnapshot.val();
      return {
        ...applicationData,
        appliedDate: new Date(applicationData.appliedDate),
      };
    } catch (error: any) {
      console.error('❌ Error getting trainer application data:', error);
      return null;
    }
  }

  // Get user's existing trainer application
  static async getUserTrainerApplication(uid: string): Promise<TrainerApplication | null> {
    try {
      const applicationRef = ref(db, `TrainerApplication/${uid}`);
      const applicationSnapshot = await get(applicationRef);
      
      if (!applicationSnapshot.exists()) {
        return null;
      }
      
      const applicationData = applicationSnapshot.val();
      return {
        ...applicationData,
        appliedDate: new Date(applicationData.appliedDate),
      };
    } catch (error: any) {
      console.error('❌ Error getting user trainer application:', error);
      return null;
    }
  }

  // Submit trainer application
  static async submitTrainerApplication(data: TrainerApplication): Promise<void> {
    try {
      console.log('🔵 Submitting trainer application for:', data.uid);
      
      // Get current user to verify authentication
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== data.uid) {
        throw new Error('User must be authenticated to submit application');
      }

      // Check if user already has an existing application
      const existingApplication = await this.getUserTrainerApplication(data.uid);
      if (existingApplication) {
        // Only allow submission if the existing application is rejected
        if (existingApplication.status !== 'rejected') {
          throw new Error(`You already have an application with status: ${existingApplication.status}. ${existingApplication.status === 'awaiting review' ? 'Please wait for review.' : 'You cannot submit another application.'}`);
        }
      }

      // Prepare data for database (convert Date to timestamp and remove undefined values)
      const applicationData: any = {
        uid: data.uid,
        fullLegalName: data.fullLegalName,
        email: data.email,
        appliedDate: data.appliedDate.getTime(), // Convert Date to timestamp
        status: data.status,
        dateOfBirth: data.dateOfBirth,
        phone: data.phone,
        physicalAddress: data.physicalAddress,
        defenseStyles: data.defenseStyles,
        yearsOfExperience: data.yearsOfExperience,
        yearsOfTeaching: data.yearsOfTeaching,
        uploadedFiles: data.uploadedFiles,
        credentialsRevoked: data.credentialsRevoked,
        felonyConviction: data.felonyConviction,
        certifyAccurate: data.certifyAccurate,
        agreeConduct: data.agreeConduct,
      };

      // Only add optional fields if they have values (not undefined, null, or empty strings)
      if (data.professionalAlias && data.professionalAlias.trim()) {
        applicationData.professionalAlias = data.professionalAlias;
      }
      if (data.academyName && data.academyName.trim()) {
        applicationData.academyName = data.academyName;
      }
      if (data.currentRank && data.currentRank.trim()) {
        applicationData.currentRank = data.currentRank;
      }
      if (data.facebookLink && data.facebookLink.trim()) {
        applicationData.facebookLink = data.facebookLink;
      }
      if (data.instagramLink && data.instagramLink.trim()) {
        applicationData.instagramLink = data.instagramLink;
      }
      if (data.otherLink && data.otherLink.trim()) {
        applicationData.otherLink = data.otherLink;
      }
      if (data.credentialsRevokedExplanation && data.credentialsRevokedExplanation.trim()) {
        applicationData.credentialsRevokedExplanation = data.credentialsRevokedExplanation;
      }
      if (data.felonyExplanation && data.felonyExplanation.trim()) {
        applicationData.felonyExplanation = data.felonyExplanation;
      }
      if (data.aboutMe && data.aboutMe.trim()) {
        applicationData.aboutMe = data.aboutMe;
      }
      
      // Handle null values for credentialsRevoked and felonyConviction
      // Firebase allows null, but we need to explicitly set it if it's null
      if (data.credentialsRevoked === null) {
        applicationData.credentialsRevoked = null;
      }
      if (data.felonyConviction === null) {
        applicationData.felonyConviction = null;
      }

      // Save to TrainerApplication table
      const applicationRef = ref(db, `TrainerApplication/${data.uid}`);
      await set(applicationRef, applicationData);
      console.log('✅ Trainer application saved successfully');

      // Also update user role to 'trainer' and set trainerApproved to false
      await update(ref(db, `users/${data.uid}`), {
        role: 'trainer',
        trainerApproved: false,
      });
      console.log('✅ User role updated to trainer');
    } catch (error: any) {
      console.error('❌ Error submitting trainer application:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
        throw new Error('Permission denied. Please check database rules.');
      }
      
      throw new Error(error.message || 'Failed to submit trainer application');
    }
  }

  // Update trainer application data
  static async updateTrainerApplication(uid: string, updates: Partial<TrainerApplication>): Promise<void> {
    try {
      console.log('🔵 Updating trainer application for:', uid);
      
      // Get current user to verify authentication
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== uid) {
        throw new Error('Unauthorized: You can only update your own trainer application');
      }

      // Prepare update data (exclude fields that shouldn't be updated)
      const updateData: any = {};
      
      if (updates.professionalAlias !== undefined) {
        updateData.professionalAlias = updates.professionalAlias.trim() || null;
      }
      if (updates.phone !== undefined) {
        updateData.phone = updates.phone;
      }
      if (updates.email !== undefined) {
        updateData.email = updates.email;
      }
      if (updates.academyName !== undefined) {
        updateData.academyName = updates.academyName.trim() || null;
      }
      if (updates.currentRank !== undefined) {
        updateData.currentRank = updates.currentRank.trim() || null;
      }
      if (updates.physicalAddress !== undefined) {
        updateData.physicalAddress = updates.physicalAddress;
      }
      if (updates.aboutMe !== undefined) {
        updateData.aboutMe = updates.aboutMe.trim() || null;
      }

      // Update TrainerApplication in database
      const applicationRef = ref(db, `TrainerApplication/${uid}`);
      await update(applicationRef, updateData);
      console.log('✅ Trainer application updated successfully');
    } catch (error: any) {
      console.error('❌ Error updating trainer application:', error);
      throw new Error(error.message || 'Failed to update trainer application');
    }
  }

  // Block user (admin only)
  static async blockUser(uid: string): Promise<void> {
    try {
      console.log('🔵 Blocking user:', uid);
      await update(ref(db, `users/${uid}`), { blocked: true });
      console.log('✅ User blocked successfully');
    } catch (error: any) {
      console.error('❌ Error blocking user:', error);
      throw new Error('Failed to block user');
    }
  }

  // Unblock user (admin only)
  static async unblockUser(uid: string): Promise<void> {
    try {
      console.log('🔵 Unblocking user:', uid);
      await update(ref(db, `users/${uid}`), { blocked: false });
      console.log('✅ User unblocked successfully');
    } catch (error: any) {
      console.error('❌ Error unblocking user:', error);
      throw new Error('Failed to unblock user');
    }
  }

  // Set up real-time listener for user blocked status
  static setupBlockedStatusListener(
    uid: string,
    onBlocked: () => void
  ): () => void {
    console.log('🔵 Setting up blocked status listener for user:', uid);
    const userRef = ref(db, `users/${uid}/blocked`);
    
    const unsubscribe = onValue(userRef, (snapshot) => {
      const isBlocked = snapshot.val();
      if (isBlocked === true) {
        console.log('⚠️ User has been blocked');
        onBlocked();
      }
    }, (error) => {
      console.error('❌ Error listening to blocked status:', error);
    });

    // Return cleanup function
    return () => {
      console.log('🔴 Removing blocked status listener');
      off(userRef);
    };
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

  /**
   * Upload video or image file to Cloudinary
   */
  static async uploadFileToCloudinary(
    fileUri: string,
    fileType: 'image' | 'video',
    fileName: string
  ): Promise<string> {
    try {
      console.log(`🔵 Starting ${fileType} upload to Cloudinary:`, fileName);
      
      // Fetch the file as a blob
      const response = await fetch(fileUri);
      const blob = await response.blob();
      console.log(`✅ ${fileType} fetched as blob, size:`, blob.size);

      // Create FormData for Cloudinary upload
      const formData = new FormData();
      formData.append('file', blob as any);
      formData.append('upload_preset', cloudinaryConfig.uploadPreset);
      formData.append('public_id', `${fileType}_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`);
      
      // Upload to Cloudinary
      const resourceType = fileType === 'video' ? 'video' : 'image';
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/${resourceType}/upload`;
      
      console.log(`🔵 Uploading ${fileType} to Cloudinary...`);
      const uploadResponse = await fetch(cloudinaryUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        console.error(`❌ Cloudinary ${fileType} upload error:`, errorData);
        throw new Error(errorData.error?.message || `Failed to upload ${fileType} to Cloudinary`);
      }

      const uploadResult = await uploadResponse.json();
      console.log(`✅ ${fileType} uploaded to Cloudinary:`, uploadResult.secure_url);

      return uploadResult.secure_url;
    } catch (error: any) {
      console.error(`❌ Error uploading ${fileType} to Cloudinary:`, error);
      throw new Error(error.message || `Failed to upload ${fileType}`);
    }
  }

  /** Max file size for message attachments: 100 MB */
  static readonly MAX_MESSAGE_FILE_SIZE_BYTES = 100 * 1024 * 1024;

  /**
   * Upload a document (PDF, etc.) to Cloudinary as raw. Enforces 100 MB max.
   */
  static async uploadDocumentToCloudinary(fileUri: string, fileName: string): Promise<string> {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    if (blob.size > this.MAX_MESSAGE_FILE_SIZE_BYTES) {
      throw new Error(`File exceeds the maximum size of 100 MB. Your file is ${(blob.size / (1024 * 1024)).toFixed(1)} MB.`);
    }
    const formData = new FormData();
    formData.append('file', blob as any);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    formData.append('public_id', `doc_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/raw/upload`;
    const uploadResponse = await fetch(cloudinaryUrl, { method: 'POST', body: formData });
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(errorData.error?.message || 'Failed to upload document');
    }
    const uploadResult = await uploadResponse.json();
    return uploadResult.secure_url;
  }

  /**
   * Upload image for messaging. Enforces 100 MB max.
   */
  static async uploadMessageImage(fileUri: string, fileName: string): Promise<string> {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    if (blob.size > this.MAX_MESSAGE_FILE_SIZE_BYTES) {
      throw new Error(`Image exceeds the maximum size of 100 MB. Your file is ${(blob.size / (1024 * 1024)).toFixed(1)} MB.`);
    }
    return this.uploadFileToCloudinary(fileUri, 'image', fileName);
  }

  /**
   * Save module to database (publish or draft)
   */
  static async saveModule(moduleData: Omit<Module, 'moduleId' | 'createdAt' | 'updatedAt'>, isDraft: boolean = false): Promise<string> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (currentUser.role !== 'trainer' || !currentUser.trainerApproved) {
        throw new Error('Only certified trainers can publish modules');
      }

      console.log('🔵 Saving module to database...');
      console.log('🔵 Module data:', {
        moduleTitle: moduleData.moduleTitle,
        category: moduleData.category,
        status: isDraft ? 'draft' : 'pending review',
      });

      // Generate unique module ID
      const moduleId = `module_${currentUser.uid}_${Date.now()}`;
      
      // Prepare module data for database
      const moduleForDB: any = {
        moduleId,
        trainerId: currentUser.uid,
        trainerName: currentUser.firstName && currentUser.lastName 
          ? `${currentUser.firstName} ${currentUser.lastName}` 
          : currentUser.username || currentUser.email,
        moduleTitle: moduleData.moduleTitle,
        description: moduleData.description,
        category: moduleData.category,
        introductionType: moduleData.introductionType,
        introduction: moduleData.introduction || null,
        introductionVideoUrl: moduleData.introductionVideoUrl || null,
        techniqueVideoUrl: moduleData.techniqueVideoUrl || null,
        techniqueVideoLink: moduleData.techniqueVideoLink || null,
        videoDuration: moduleData.videoDuration || null,
        thumbnailUrl: moduleData.thumbnailUrl || null,
        intensityLevel: moduleData.intensityLevel,
        spaceRequirements: moduleData.spaceRequirements || [],
        physicalDemandTags: moduleData.physicalDemandTags || [],
        repRange: moduleData.repRange || null,
        trainingDurationSeconds: moduleData.trainingDurationSeconds ?? null,
        status: isDraft ? 'draft' : 'pending review',
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
        submittedAt: isDraft ? null : new Date().getTime(),
        certificationChecked: moduleData.certificationChecked,
      };

      // Save module to database
      const modulePath = `modules/${moduleId}`;
      console.log('🔵 Saving to path:', modulePath);
      
      await set(ref(db, modulePath), moduleForDB);
      console.log('✅ Module saved to database:', modulePath);

      // Also save reference under trainer's modules
      const trainerModulesPath = `trainerModules/${currentUser.uid}/${moduleId}`;
      await set(ref(db, trainerModulesPath), {
        moduleId,
        moduleTitle: moduleData.moduleTitle,
        status: moduleForDB.status,
        createdAt: moduleForDB.createdAt,
        updatedAt: moduleForDB.updatedAt,
      });
      console.log('✅ Module reference saved to trainerModules:', trainerModulesPath);

      return moduleId;
    } catch (error: any) {
      console.error('❌ Error saving module:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
        throw new Error('Database permission denied. Please check Firebase Console → Realtime Database → Rules.');
      }
      
      throw new Error(error.message || 'Failed to save module');
    }
  }

  // Get all modules (admin only)
  static async getAllModules(): Promise<Module[]> {
    try {
      // First, verify the user is authenticated via Firebase Auth
      let currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('🔵 Auth not ready, waiting for auth state...');
        currentUser = await this.waitForAuth();
      }

      if (!currentUser) {
        console.error('❌ User not authenticated via Firebase Auth');
        throw new Error('Permission denied. User must be authenticated. Please log in again.');
      }

      console.log('🔵 Current authenticated user UID:', currentUser.uid);

      // Verify the user is an admin by checking their role in the database
      const currentUserRef = ref(db, `users/${currentUser.uid}`);
      const currentUserSnapshot = await get(currentUserRef);
      
      if (!currentUserSnapshot.exists()) {
        console.error('❌ Current user data not found in database');
        throw new Error('Permission denied. User data not found.');
      }

      const currentUserData = currentUserSnapshot.val();
      const userRole = currentUserData?.role || 'individual';
      
      console.log('🔵 Current user role:', userRole);

      if (userRole !== 'admin') {
        console.error('❌ User is not an admin. Role:', userRole);
        throw new Error('Permission denied. Admin access required.');
      }

      console.log('✅ Admin verification passed. Fetching all modules from database...');
      
      const modulesRef = ref(db, 'modules');
      const modulesSnapshot = await get(modulesRef);
      
      if (!modulesSnapshot.exists()) {
        console.log('⚠️ No modules found in database');
        return [];
      }

      const modulesData = modulesSnapshot.val();
      console.log('🔵 Modules data keys:', Object.keys(modulesData || {}));
      
      const modules: Module[] = [];

      // Convert each module object to Module type
      for (const moduleId in modulesData) {
        if (!modulesData.hasOwnProperty(moduleId)) continue;
        
        const moduleDataRaw = modulesData[moduleId];
        
        // Skip if moduleDataRaw is null or not an object
        if (!moduleDataRaw || typeof moduleDataRaw !== 'object') {
          console.warn(`⚠️ Skipping invalid module data for ID: ${moduleId}`);
          continue;
        }
        
        try {
          const module: Module = {
            ...moduleDataRaw,
            moduleId,
            createdAt: moduleDataRaw.createdAt ? new Date(moduleDataRaw.createdAt) : new Date(),
            updatedAt: moduleDataRaw.updatedAt ? new Date(moduleDataRaw.updatedAt) : new Date(),
            submittedAt: moduleDataRaw.submittedAt ? new Date(moduleDataRaw.submittedAt) : undefined,
            reviewedAt: moduleDataRaw.reviewedAt ? new Date(moduleDataRaw.reviewedAt) : undefined,
            status: moduleDataRaw.status || 'draft',
            certificationChecked: moduleDataRaw.certificationChecked || false,
            // Normalize arrays
            spaceRequirements: this.normalizeArray(moduleDataRaw.spaceRequirements) || [],
            physicalDemandTags: this.normalizeArray(moduleDataRaw.physicalDemandTags) || [],
          };
          modules.push(module);
        } catch (moduleError) {
          console.error(`❌ Error processing module ${moduleId}:`, moduleError);
          // Continue with other modules
        }
      }

      // Sort by createdAt (newest first)
      modules.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      console.log(`✅ Retrieved ${modules.length} modules from database`);
      return modules;
    } catch (error: any) {
      console.error('❌ Error fetching all modules:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      
      // Check for permission errors
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED' || error.message?.includes('Permission denied')) {
        console.error('⚠️ PERMISSION DENIED: Admin may not have read access to all modules');
        throw new Error('Permission denied. Please check database security rules. Admin needs read access to modules/ path.');
      }
      
      throw new Error(error.message || 'Failed to fetch modules');
    }
  }

  // Get approved modules for user dashboard (any authenticated user)
  static async getApprovedModules(): Promise<Module[]> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const modulesRef = ref(db, 'modules');
      const modulesSnapshot = await get(modulesRef);

      if (!modulesSnapshot.exists()) {
        return [];
      }

      const modulesData = modulesSnapshot.val();
      const modules: Module[] = [];

      for (const moduleId in modulesData) {
        if (!modulesData.hasOwnProperty(moduleId)) continue;
        const moduleDataRaw = modulesData[moduleId];
        if (!moduleDataRaw || typeof moduleDataRaw !== 'object') continue;
        if (moduleDataRaw.status !== 'approved') continue;

        try {
          const module: Module = {
            ...moduleDataRaw,
            moduleId,
            createdAt: moduleDataRaw.createdAt ? new Date(moduleDataRaw.createdAt) : new Date(),
            updatedAt: moduleDataRaw.updatedAt ? new Date(moduleDataRaw.updatedAt) : new Date(),
            submittedAt: moduleDataRaw.submittedAt ? new Date(moduleDataRaw.submittedAt) : undefined,
            reviewedAt: moduleDataRaw.reviewedAt ? new Date(moduleDataRaw.reviewedAt) : undefined,
            status: moduleDataRaw.status || 'draft',
            certificationChecked: moduleDataRaw.certificationChecked || false,
            spaceRequirements: this.normalizeArray(moduleDataRaw.spaceRequirements) || [],
            physicalDemandTags: this.normalizeArray(moduleDataRaw.physicalDemandTags) || [],
          };
          modules.push(module);
        } catch (moduleError) {
          console.error(`Error processing module ${moduleId}:`, moduleError);
        }
      }

      modules.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return modules;
    } catch (error: any) {
      console.error('Error fetching approved modules:', error);
      throw new Error(error.message || 'Failed to fetch modules');
    }
  }

  // Get a single module by ID for user viewing (returns only if approved)
  static async getModuleByIdForUser(moduleId: string): Promise<Module | null> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const moduleRef = ref(db, `modules/${moduleId}`);
      const moduleSnapshot = await get(moduleRef);

      if (!moduleSnapshot.exists()) {
        return null;
      }

      const moduleDataRaw = moduleSnapshot.val();
      if (moduleDataRaw.status !== 'approved') {
        return null;
      }

      const module: Module = {
        ...moduleDataRaw,
        moduleId,
        createdAt: moduleDataRaw.createdAt ? new Date(moduleDataRaw.createdAt) : new Date(),
        updatedAt: moduleDataRaw.updatedAt ? new Date(moduleDataRaw.updatedAt) : new Date(),
        submittedAt: moduleDataRaw.submittedAt ? new Date(moduleDataRaw.submittedAt) : undefined,
        reviewedAt: moduleDataRaw.reviewedAt ? new Date(moduleDataRaw.reviewedAt) : undefined,
        status: moduleDataRaw.status || 'draft',
        certificationChecked: moduleDataRaw.certificationChecked || false,
        spaceRequirements: this.normalizeArray(moduleDataRaw.spaceRequirements) || [],
        physicalDemandTags: this.normalizeArray(moduleDataRaw.physicalDemandTags) || [],
      };

      return module;
    } catch (error: any) {
      console.error('Error fetching module:', error);
      throw new Error(error.message || 'Failed to fetch module');
    }
  }

  // Get a single module by ID (admin only)
  static async getModuleById(moduleId: string): Promise<Module | null> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Verify admin access
      if (currentUser.role !== 'admin') {
        throw new Error('Permission denied. Admin access required.');
      }

      const moduleRef = ref(db, `modules/${moduleId}`);
      const moduleSnapshot = await get(moduleRef);

      if (!moduleSnapshot.exists()) {
        return null;
      }

      const moduleDataRaw = moduleSnapshot.val();
      const module: Module = {
        ...moduleDataRaw,
        moduleId,
        createdAt: moduleDataRaw.createdAt ? new Date(moduleDataRaw.createdAt) : new Date(),
        updatedAt: moduleDataRaw.updatedAt ? new Date(moduleDataRaw.updatedAt) : new Date(),
        submittedAt: moduleDataRaw.submittedAt ? new Date(moduleDataRaw.submittedAt) : undefined,
        reviewedAt: moduleDataRaw.reviewedAt ? new Date(moduleDataRaw.reviewedAt) : undefined,
        status: moduleDataRaw.status || 'draft',
        certificationChecked: moduleDataRaw.certificationChecked || false,
        spaceRequirements: this.normalizeArray(moduleDataRaw.spaceRequirements) || [],
        physicalDemandTags: this.normalizeArray(moduleDataRaw.physicalDemandTags) || [],
      };

      return module;
    } catch (error: any) {
      console.error('❌ Error fetching module:', error);
      throw new Error(error.message || 'Failed to fetch module');
    }
  }

  // Approve module (admin only)
  static async approveModule(moduleId: string): Promise<void> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Verify admin access
      if (currentUser.role !== 'admin') {
        throw new Error('Permission denied. Admin access required.');
      }

      console.log('🔵 Approving module:', moduleId);

      const now = Date.now();
      await update(ref(db, `modules/${moduleId}`), {
        status: 'approved',
        reviewedAt: now,
        reviewedBy: currentUser.uid,
        updatedAt: now,
      });

      console.log('✅ Module approved successfully');
    } catch (error: any) {
      console.error('❌ Error approving module:', error);
      throw new Error(error.message || 'Failed to approve module');
    }
  }

  // Reject module (admin only)
  static async rejectModule(moduleId: string, rejectionReason: string): Promise<void> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Verify admin access
      if (currentUser.role !== 'admin') {
        throw new Error('Permission denied. Admin access required.');
      }

      console.log('🔵 Rejecting module:', moduleId);

      const now = Date.now();
      await update(ref(db, `modules/${moduleId}`), {
        status: 'rejected',
        rejectionReason: rejectionReason,
        reviewedAt: now,
        reviewedBy: currentUser.uid,
        updatedAt: now,
      });

      console.log('✅ Module rejected successfully');
    } catch (error: any) {
      console.error('❌ Error rejecting module:', error);
      throw new Error(error.message || 'Failed to reject module');
    }
  }

  /** Delete module (admin only) and send deletion reason to trainer via messaging. */
  static async deleteModule(moduleId: string, reason: string): Promise<void> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      if (currentUser.role !== 'admin') {
        throw new Error('Permission denied. Admin access required.');
      }

      const module = await this.getModuleById(moduleId);
      if (!module) {
        throw new Error('Module not found');
      }

      const trainerId = module.trainerId;
      const trainerName = module.trainerName || 'Trainer';
      const moduleTitle = module.moduleTitle;

      const adminDisplayName =
        currentUser.firstName && currentUser.lastName
          ? `${currentUser.firstName} ${currentUser.lastName}`
          : currentUser.username || 'DEFENDU Admin';
      const adminPhoto = currentUser.profilePicture || null;

      let trainerPhoto: string | null = null;
      try {
        const trainerUser = await this.getUserByUid(trainerId);
        if (trainerUser?.profilePicture) trainerPhoto = trainerUser.profilePicture;
      } catch {
        // optional
      }

      const chatId = await MessageController.getOrCreateChat(
        currentUser.uid,
        trainerId,
        adminDisplayName,
        adminPhoto,
        trainerName,
        trainerPhoto
      );

      const messageText = `Your module "${moduleTitle}" has been removed from the platform. Reason: ${reason}`;
      await MessageController.sendMessage(chatId, currentUser.uid, messageText);

      await remove(ref(db, `modules/${moduleId}`));
      await remove(ref(db, `trainerModules/${trainerId}/${moduleId}`));

      console.log('✅ Module deleted and trainer notified');
    } catch (error: any) {
      console.error('❌ Error deleting module:', error);
      throw new Error(error.message || 'Failed to delete module');
    }
  }

  /** Submit or update a review (1-5 stars + optional comment) for a module. One review per user per module. */
  static async submitModuleReview(moduleId: string, rating: number, comment?: string): Promise<void> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }
      const userName =
        currentUser.firstName && currentUser.lastName
          ? `${currentUser.firstName} ${currentUser.lastName}`
          : currentUser.username || 'User';
      const now = Date.now();
      const reviewPath = `moduleReviews/${moduleId}/${currentUser.uid}`;
      await set(ref(db, reviewPath), {
        rating,
        comment: comment?.trim() || null,
        createdAt: now,
        userName,
      });
    } catch (error: any) {
      console.error('Error submitting module review:', error);
      throw new Error(error.message || 'Failed to submit review');
    }
  }

  /** Get all reviews for a module, sorted by createdAt descending. */
  static async getModuleReviews(moduleId: string): Promise<ModuleReview[]> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      const reviewsRef = ref(db, `moduleReviews/${moduleId}`);
      const snapshot = await get(reviewsRef);
      if (!snapshot.exists()) {
        return [];
      }
      const data = snapshot.val();
      const list: ModuleReview[] = [];
      for (const uid of Object.keys(data)) {
        const r = data[uid];
        list.push({
          moduleId,
          userId: uid,
          userName: r.userName || 'User',
          rating: typeof r.rating === 'number' ? r.rating : 0,
          comment: r.comment || undefined,
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
        });
      }
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return list;
    } catch (error: any) {
      console.error('Error fetching module reviews:', error);
      throw new Error(error.message || 'Failed to fetch reviews');
    }
  }
}